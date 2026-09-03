import Link from 'next/link'
import {
  ZONE,
  debutDeJour,
  debutDeSemaine,
  ajouterJours,
  joursDeLaSemaine,
  instantVersHeureLocale,
  formatDistance,
  distanceALaZone,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { zoneDuPro } from '@/lib/zone'
import { libererPlage } from './actions'
import { trajetsDeLaJournee, libelleTrajet, type Trajets } from '@/lib/tournee'
import {
  EnteteEcran,
  CorpsEcran,
  BoutonPointille,
  RANGEE,
  PastilleEtat,
} from '@/components/composition'

/**
 * B10, l'agenda de planification. Planche 16a.
 *
 * Vue JOUR par défaut, comme la planche : c'est la question du matin. La vue
 * semaine n'est pas une grille horaire, c'est un RADAR DE CHARGE, une barre par
 * jour, framboise pour ce qui est réservé, abricot pour ce qui attend une
 * décision, gris pour ce qui reste libre.
 *
 * « À décider » n'apparaît que s'il y a à décider, et passe en tête : une
 * demande qui dort est une cliente qui part ailleurs. La carte est abricot,
 * elle se voit avant tout le reste.
 *
 * Un tap sur une carte ouvre la CONSULTATION (16b), jamais l'édition.
 *
 * Jamais de serif dans l'agenda, sauf la date en tête : c'est la règle typo du
 * design system, et la planche la respecte au caractère près.
 */

const T = copy.agendaTournee
const D = copy.demandesPro
const V = copy.etatsVides

const heure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
const jourLong = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const jourCourt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  day: 'numeric',
  month: 'long',
})
const jourRadar = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'short',
  day: 'numeric',
})

/** Détour routier moyen par rapport à la ligne droite (cf. moteur de trajets). */
const FACTEUR_DETOUR = 1.35

type Vue = 'jour' | 'semaine'

type Cliente = { first_name: string; last_name: string | null }

/**
 * PostgREST renvoie une relation imbriquée tantôt en objet, tantôt en tableau
 * selon la cardinalité qu'il détecte. Les types générés ne le disent pas : on
 * normalise ici, une fois.
 */
function clienteDe(relation: unknown): Cliente | undefined {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return undefined
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return undefined
  return {
    first_name: c.first_name,
    last_name: typeof c.last_name === 'string' ? c.last_name : null,
  }
}

const nomDe = (cliente: Cliente | undefined) =>
  cliente ? `${cliente.first_name} ${cliente.last_name ?? ''}`.trim() : 'Sans fiche'

// Une seule chaîne littérale, sans concaténation : PostgREST déduit le type du
// résultat de ce littéral, et une somme de deux morceaux le lui interdit.
const CHAMPS =
  'id, starts_at, ends_at, service_name, price_cents, status, source, city, address_line1, lat, lng, out_of_zone, stay_from, stay_to, client_id, clients(first_name, last_name)'

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; le?: string; adresse?: string }>
}) {
  await requirePro()
  const { vue: vueBrute, le, adresse } = await searchParams
  // Vue jour par défaut (planche 16a) : c'est la journée qu'on vient regarder.
  const vue: Vue = vueBrute === 'semaine' ? 'semaine' : 'jour'

  // `le` vient de l'URL : on ne lui fait pas confiance pour construire une date.
  const ancre = ancreValide(le)
  const debut = vue === 'jour' ? debutDeJour(ancre) : debutDeSemaine(ancre)
  const fin = ajouterJours(debut, vue === 'jour' ? 1 : 7)

  const supabase = await supabaseServer()
  const [{ data: rdvs }, { data: aDecider }, { data: blocages }] = await Promise.all([
    supabase
      .from('appointments')
      .select(CHAMPS)
      .gte('starts_at', debut.toISOString())
      .lt('starts_at', fin.toISOString())
      .order('starts_at'),
    // Les demandes à décider ne suivent pas la semaine affichée : une demande
    // pour dans trois semaines doit sauter aux yeux aujourd'hui.
    supabase
      .from('appointments')
      .select(CHAMPS)
      .in('status', ['pending', 'conditional'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at'),
    // B4 : les plages bloquées se lisent DANS la journée, à leur place, pas
    // dans une liste à part. Une plage qu'on ne voit pas est une plage qu'on
    // croit libre.
    supabase
      .from('blocked_slots')
      .select('id, starts_at, ends_at, label')
      .gte('starts_at', debut.toISOString())
      .lt('starts_at', fin.toISOString())
      .order('starts_at'),
  ])

  // Les temps de trajet n'ont de sens que sur une journée vécue : en vue
  // semaine, on ne va pas interroger le moteur sept fois pour de la
  // planification.
  const trajets: Trajets =
    vue === 'jour' ? await trajetsDeLaJournee(rdvs ?? []) : new Map<string, never>()

  const precedent = instantVersHeureLocale(ajouterJours(debut, vue === 'jour' ? -1 : -7)).slice(
    0,
    10,
  )
  const suivant = instantVersHeureLocale(ajouterJours(debut, vue === 'jour' ? 1 : 7)).slice(0, 10)
  const ancreCourante = instantVersHeureLocale(debut).slice(0, 10)
  const autreVue: Vue = vue === 'jour' ? 'semaine' : 'jour'

  const duJour = rdvs ?? []
  const minutesTrajet = [...trajets.values()].reduce((somme, t) => somme + t.minutes, 0)
  const derniere = duJour.length > 0 ? duJour[duJour.length - 1] : null

  return (
    <>
      <EnteteEcran
        variante="jour"
        statement={
          vue === 'jour'
            ? capitale(jourLong.format(debut))
            : remplir(T.agenda.semaine, { date: jourCourt.format(debut) })
        }
        sousTitre={
          vue === 'jour' && duJour.length > 0 && derniere
            ? remplir(T.gabarits.resumeJour, {
                n: String(duJour.length),
                trajet: minutesTrajet > 0 ? `${String(minutesTrajet)} min` : '0 min',
                fin: heure.format(new Date(derniere.ends_at)),
              })
            : undefined
        }
        action={
          // La planche ne met qu'un contrôle dans le bandeau : la bascule de
          // vue. Les flèches de jour descendent en pied de liste, sinon la
          // date longue (« Jeudi 3 septembre ») passe à deux lignes et le
          // bandeau double de hauteur.
          <Link
            href={`/app/agenda?vue=${autreVue}&le=${ancreCourante}`}
            className="tactile shrink-0 rounded-pilule bg-texte-sur-plein/14 px-2.5 text-[11px] font-extrabold"
          >
            {vue === 'jour' ? 'Semaine' : 'Jour'}
          </Link>
        }
      />

      <CorpsEcran serre>
        {adresse === 'commune' || adresse === 'inconnue' ? (
          <p
            role="status"
            className="rounded-champ bg-attente px-3.5 py-2.5 text-[12px] font-semibold"
          >
            {adresse === 'commune' ? D.$aEcrire.adresseApprochee : D.$aEcrire.adresseInconnue}
          </p>
        ) : null}

        <ADecider demandes={aDecider ?? []} />

        {vue === 'jour'
          ? (blocages ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2.5 rounded-carte border-[1.5px] border-dashed border-texte-principal/30 px-3.5 py-3"
              >
                <span className="w-[42px] shrink-0 text-[13px] font-extrabold text-texte-attenue">
                  {heure.format(new Date(b.starts_at))}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[13px] font-bold text-texte-attenue">
                    {T.$aEcrire.blocageIndisponible}
                    {' · '}
                    {heure.format(new Date(b.ends_at))}
                  </span>
                  {b.label ? (
                    <span className="text-[11.5px] text-texte-attenue">{b.label}</span>
                  ) : null}
                </span>
                <form action={libererPlage} className="shrink-0">
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="text-[12px] font-bold text-action hover:text-action-survol"
                  >
                    {T.$aEcrire.blocageLiberer}
                  </button>
                </form>
              </div>
            ))
          : null}

        {vue === 'semaine' ? (
          <Radar ancre={ancre} rdvs={duJour} />
        ) : duJour.length === 0 ? (
          <AgendaVide />
        ) : (
          <ul className="flex flex-col gap-2">
            {duJour.map((r) => {
              const trajet = trajets.get(r.id)
              const annule = r.status === 'cancelled'
              const enCours =
                !annule && new Date(r.starts_at) <= new Date() && new Date(r.ends_at) > new Date()
              const termine = !annule && new Date(r.ends_at) <= new Date()
              return (
                <li key={r.id} className="flex flex-col gap-2">
                  {/* Le trajet se lit entre les deux rendez-vous qu'il relie,
                      pas dans une colonne à part : c'est ce qui fait lire la
                      journée comme une tournée. */}
                  {trajet ? (
                    <p className="pl-3.5 text-[11px] font-bold text-texte-secondaire">
                      · · {libelleTrajet(trajet)}
                    </p>
                  ) : null}
                  <Link
                    href={`/app/agenda/${r.id}`}
                    className={`${RANGEE} gap-2.5 px-3.5 py-3 hover:bg-fond ${
                      enCours ? 'border-2 border-action' : ''
                    } ${annule ? 'opacity-55' : ''}`}
                  >
                    <span className="w-[42px] shrink-0 text-[13px] font-extrabold">
                      {heure.format(new Date(r.starts_at))}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className={`text-[13px] font-bold ${annule ? 'line-through' : ''}`}>
                        {nomDe(clienteDe(r.clients))} · {r.service_name}
                      </span>
                      {r.city || r.address_line1 ? (
                        <span className="text-[11.5px] text-texte-attenue">
                          {r.address_line1 ?? r.city}
                        </span>
                      ) : null}
                    </span>
                    <EtatRdv annule={annule} enCours={enCours} termine={termine} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {vue === 'jour' ? (
          <BoutonPointille href="/app/agenda/bloquer">+ {T.$aEcrire.bloquer}</BoutonPointille>
        ) : null}

        <nav className="flex justify-between pt-2 text-[12px] font-bold text-texte-attenue">
          <Link href={`/app/agenda?vue=${vue}&le=${precedent}`} className="hover:text-prune">
            ‹ {vue === 'jour' ? 'Veille' : 'Semaine précédente'}
          </Link>
          <Link href={`/app/agenda?vue=${vue}&le=${suivant}`} className="hover:text-prune">
            {vue === 'jour' ? 'Lendemain' : 'Semaine suivante'} ›
          </Link>
        </nav>
      </CorpsEcran>

      {/*
        Le bouton flottant de la planche : framboise, au-dessus de la barre de
        navigation. C'est le chemin des rendez-vous pris par téléphone, et il ne
        doit jamais demander de descendre au bas d'une liste. Il s'efface quand
        l'écran est vide : l'état vide porte déjà l'action, et deux affordances
        d'ajout côte à côte ont déjà été relevées comme un défaut à la recette 6.
      */}
      {duJour.length > 0 || vue === 'semaine' ? (
        <Link
          href="/app/agenda/nouveau"
          aria-label={T.agenda.ajouter}
          className="tactile sticky bottom-3 z-20 ml-auto size-14 min-h-14 min-w-14 rounded-pilule bg-action text-2xl font-bold text-texte-sur-plein shadow-lg hover:bg-action-survol"
        >
          <span aria-hidden>+</span>
        </Link>
      ) : null}
    </>
  )
}

/** Les trois badges de la planche : miel fait, framboise en cours, contour à venir. */
function EtatRdv({
  annule,
  enCours,
  termine,
}: {
  annule: boolean
  enCours: boolean
  termine: boolean
}) {
  if (annule) {
    return <span className="shrink-0 text-[10px] font-extrabold text-texte-attenue">Annulé</span>
  }
  if (termine) return <PastilleEtat>{T.etats.termine}</PastilleEtat>
  if (enCours) {
    return (
      <span className="shrink-0 rounded-pilule bg-action px-2 py-1 text-[10px] font-extrabold whitespace-nowrap text-texte-sur-plein">
        {T.etats.enCours}
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-pilule border-[1.5px] border-texte-principal/25 px-2 py-1 text-[10px] font-extrabold whitespace-nowrap">
      {T.$aEcrire.aVenir}
    </span>
  )
}

/**
 * La semaine : un radar de charge, jamais une grille horaire.
 *
 * Une barre par jour, dont les segments disent l'occupation réelle : framboise
 * pour ce qui est réservé, abricot pour ce qui attend une décision, gris pour
 * ce qui reste. Un tap sur un jour ouvre sa vue jour.
 */
function Radar({ ancre, rdvs }: { ancre: Date; rdvs: { starts_at: string; status: string }[] }) {
  const jours = joursDeLaSemaine(ancre)

  return (
    <>
      <ul className="flex flex-col gap-[7px]">
        {jours.map((jour) => {
          const finJour = ajouterJours(jour, 1)
          const duJour = rdvs.filter((r) => {
            const t = new Date(r.starts_at).getTime()
            return t >= jour.getTime() && t < finJour.getTime()
          })
          const reserves = duJour.filter(
            (r) => r.status !== 'cancelled' && r.status !== 'pending' && r.status !== 'conditional',
          ).length
          const attente = duJour.filter(
            (r) => r.status === 'pending' || r.status === 'conditional',
          ).length
          const libre = Math.max(0, 4 - reserves - attente)

          return (
            <li key={jour.toISOString()}>
              <Link
                href={`/app/agenda?vue=jour&le=${instantVersHeureLocale(jour).slice(0, 10)}`}
                className="flex items-center gap-2.5 rounded-[14px] bg-surface px-3.5 py-[11px] hover:bg-fond"
              >
                <span className="w-[58px] shrink-0 text-[12px] font-extrabold capitalize">
                  {jourRadar.format(jour)}
                </span>
                <span aria-hidden className="flex flex-1 gap-[3px]">
                  {reserves > 0 ? (
                    <span className="h-3 rounded-pilule bg-action" style={{ flex: reserves }} />
                  ) : null}
                  {attente > 0 ? (
                    <span className="h-3 rounded-pilule bg-attente" style={{ flex: attente }} />
                  ) : null}
                  {libre > 0 ? (
                    <span className="h-3 rounded-pilule bg-trait-discret" style={{ flex: libre }} />
                  ) : null}
                </span>
                <span className="w-[52px] shrink-0 text-right text-[11.5px] font-bold">
                  {attente > 0
                    ? `${String(reserves)} + ${String(attente)} ?`
                    : remplir(T.gabarits.nRdv, { n: String(reserves) })}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="text-[11.5px] leading-[1.5] text-texte-attenue">{T.agenda.legende}</p>
    </>
  )
}

/**
 * L'état vide du jour un : deux issues, LE PARTAGE D'ABORD.
 *
 * La planche est explicite sur l'ordre : l'état vide travaille pour l'objectif
 * des 48 heures de l'onboarding.
 */
function AgendaVide() {
  return (
    <div className="my-auto flex flex-col gap-2.5 py-6 text-center">
      <p className="text-[14px] font-bold">{T.agenda.pret}</p>
      <p className="text-[12.5px] leading-[1.5] text-texte-attenue">{T.agenda.pretInvitation}</p>
      <Link
        href="/app/parametrage/profil"
        className="tactile w-full rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol"
      >
        {V.agendaVide.bouton}
      </Link>
      <Link
        href="/app/agenda/nouveau"
        className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[13px] font-bold hover:border-prune"
      >
        {T.agenda.ajouter}
      </Link>
    </div>
  )
}

type Demande = {
  id: string
  starts_at: string
  service_name: string
  price_cents: number
  status: string
  city: string | null
  address_line1: string | null
  lat: number | null
  lng: number | null
  out_of_zone: boolean
  stay_from: string | null
  stay_to: string | null
  clients: unknown
}

/**
 * A6 / A11 : les demandes qui attendent une décision.
 *
 * Carte abricot en tête de l'agenda, comme la planche 16a : elle se voit avant
 * tout le reste. Chaque ligne dit qui, quand, et POURQUOI elle attend une
 * décision. La décision elle-même se prend sur la consultation du rendez-vous
 * (16b) : la planche met un chevron, pas deux boutons.
 */
async function ADecider({ demandes }: { demandes: Demande[] }) {
  if (demandes.length === 0) return null

  const { pro } = await requirePro()
  const zone = await zoneDuPro(pro.id)

  return (
    <section className="flex flex-col gap-2 rounded-carte bg-attente px-3.5 py-3">
      <h2 className="text-[12px] font-extrabold">
        {remplir(T.gabarits.aDecider, { n: String(demandes.length) })}
      </h2>
      {demandes.map((demande) => (
        <Link
          key={demande.id}
          href={`/app/agenda/${demande.id}`}
          className="flex items-center justify-between gap-2.5 rounded-champ bg-surface px-3 py-2.5"
        >
          <span className="min-w-0 text-[12px] font-bold">
            {nomDe(clienteDe(demande.clients))} · {jourCourt.format(new Date(demande.starts_at))} ·{' '}
            {heure.format(new Date(demande.starts_at))}{' '}
            <span className="font-semibold text-texte-attenue">· {motif(demande, zone)}</span>
          </span>
          <span aria-hidden className="shrink-0 text-[14px]">
            ›
          </span>
        </Link>
      ))}
    </section>
  )
}

/**
 * Pourquoi cette demande attend une décision, en trois mots.
 *
 * L'écart à la zone est recalculé à l'affichage plutôt que stocké : la zone du
 * pro change quand il ajoute une commune, et un chiffre figé mentirait dès le
 * lendemain.
 */
function motif(demande: Demande, zone: Awaited<ReturnType<typeof zoneDuPro>>): string {
  if (demande.stay_from && demande.stay_to) return D.badge
  if (!demande.out_of_zone) return T.etats.sousReserve
  if (demande.lat === null || demande.lng === null) return T.etats.sousReserve
  const ecart = distanceALaZone(zone, { lat: demande.lat, lng: demande.lng })
  // Distance routière approchée : la ligne droite sous-estime toujours.
  const km = ecart ? ecart.distanceKm * FACTEUR_DETOUR : 0
  // Un « hors zone +0 m » ne dit rien à personne : sous ce seuil, c'est le
  // motif qui parle, pas la distance.
  if (km < 0.1) return T.etats.sousReserve
  return remplir(T.gabarits.horsZoneCourt, { km: formatDistance(km) })
}

/** « jeudi 3 septembre » devient « Jeudi 3 septembre » : c'est un statement. */
const capitale = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1)

/** N'accepte qu'une date « AAAA-MM-JJ » plausible ; sinon, aujourd'hui. */
function ancreValide(le: string | undefined): Date {
  if (!le || !/^\d{4}-\d{2}-\d{2}$/.test(le)) return new Date()
  const t = Date.parse(`${le}T12:00:00Z`)
  return Number.isNaN(t) ? new Date() : new Date(t)
}
