import Link from 'next/link'
import {
  ZONE,
  debutDeJour,
  debutDeSemaine,
  ajouterJours,
  joursDeLaSemaine,
  instantVersHeureLocale,
  formatEuros,
  formatDistance,
  distanceALaZone,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { zoneDuPro } from '@/lib/zone'
import { trajetsDeLaJournee, libelleTrajet, type Trajets } from '@/lib/tournee'
import { annulerRdv, validerDemande, refuserDemande } from './actions'

/**
 * B10 : l'agenda de planification.
 *
 * Distinct de « Ma tournée » (C0), qui montre le jour vécu : ici c'est la vue
 * de gestion, sur grand écran.
 *
 * Deux ajouts par rapport à la planification pure. Les demandes à décider
 * (A6 hors zone, A11 confirmation manuelle) passent en tête : une demande qui
 * dort est une cliente qui part ailleurs. Et en vue jour, les temps de trajet
 * s'affichent entre les rendez-vous, comme sur la tournée.
 */

const D = copy.demandesPro

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
const moisAnnee = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  month: 'long',
  year: 'numeric',
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
  const vue: Vue = vueBrute === 'jour' ? 'jour' : 'semaine'

  // `le` vient de l'URL : on ne lui fait pas confiance pour construire une date.
  const ancre = ancreValide(le)
  const debut = vue === 'jour' ? debutDeJour(ancre) : debutDeSemaine(ancre)
  const fin = ajouterJours(debut, vue === 'jour' ? 1 : 7)
  const jours = vue === 'jour' ? [debut] : joursDeLaSemaine(ancre)

  const supabase = await supabaseServer()
  const [{ data: rdvs }, { data: aDecider }] = await Promise.all([
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight capitalize">
          {moisAnnee.format(debut)}
        </h1>
        <Link
          href="/app/agenda/nouveau"
          className="rounded-pilule bg-action px-6 py-3 font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
        >
          Ajouter un rendez-vous
        </Link>
      </div>

      {adresse === 'imprecise' ? (
        <p role="status" className="mt-6 rounded-carte bg-attente/25 px-5 py-4">
          Rendez-vous enregistré, mais l’adresse n’a pas été reconnue. Les temps de trajet ne seront
          pas calculés pour celui-ci : corrige-la depuis la fiche si tu veux qu’il compte dans ta
          tournée.
        </p>
      ) : null}

      <ADecider demandes={aDecider ?? []} />

      <nav className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold">
        <Link
          href={`/app/agenda?vue=${vue}&le=${precedent}`}
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          ← Précédent
        </Link>
        <Link
          href={`/app/agenda?vue=${vue}`}
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          Aujourd’hui
        </Link>
        <Link
          href={`/app/agenda?vue=${vue}&le=${suivant}`}
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          Suivant →
        </Link>
        <span className="ml-auto flex gap-2">
          {(['jour', 'semaine'] as Vue[]).map((v) => (
            <Link
              key={v}
              href={`/app/agenda?vue=${v}&le=${instantVersHeureLocale(debut).slice(0, 10)}`}
              aria-current={vue === v ? 'page' : undefined}
              className={`tactile rounded-pilule px-4 capitalize ${vue === v ? 'bg-prune text-texte-sur-plein' : 'border-2 border-trait-discret hover:border-prune'}`}
            >
              {v}
            </Link>
          ))}
        </span>
      </nav>

      <div className="mt-8 space-y-6">
        {jours.map((jour) => {
          const finJour = ajouterJours(jour, 1)
          const duJour = (rdvs ?? []).filter((r) => {
            const t = new Date(r.starts_at).getTime()
            return t >= jour.getTime() && t < finJour.getTime()
          })

          return (
            <section key={jour.toISOString()}>
              <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
                {jourLong.format(jour)}
              </h2>

              {duJour.length === 0 ? (
                <p className="mt-2 rounded-carte bg-fond px-5 py-4 text-texte-secondaire">
                  Aucun rendez-vous.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {duJour.map((r) => {
                    const annule = r.status === 'cancelled'
                    const trajet = trajets.get(r.id)
                    return (
                      <li key={r.id}>
                        {/* Le trajet se lit entre les deux rendez-vous qu'il
                            relie, pas dans une colonne à part : c'est ce qui
                            fait lire la journée comme une tournée. */}
                        {trajet ? (
                          <p className="flex items-center gap-3 py-2 pl-5 text-sm font-semibold text-texte-secondaire">
                            <span aria-hidden className="trait-trajet" />
                            {libelleTrajet(trajet)}
                          </p>
                        ) : null}
                        <div
                          className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-carte border-2 border-trait-discret p-5 ${
                            annule ? 'text-texte-secondaire' : ''
                          }`}
                        >
                          <span className="font-mono text-lg font-bold">
                            {heure.format(new Date(r.starts_at))}
                            <span className="text-texte-secondaire">
                              {' à '}
                              {heure.format(new Date(r.ends_at))}
                            </span>
                          </span>
                          <span className={`text-lg font-bold ${annule ? 'line-through' : ''}`}>
                            {nomDe(clienteDe(r.clients))}
                          </span>
                          <span className="text-texte-secondaire">
                            {r.service_name} · {formatEuros(r.price_cents)}
                            {r.city ? ` · ${r.city}` : ''}
                          </span>
                          {r.source === 'online' ? (
                            <span className="rounded-pilule bg-fond px-3 py-1 text-xs font-bold">
                              En ligne
                            </span>
                          ) : null}
                          {r.status === 'conditional' ? (
                            <span className="rounded-pilule bg-attente/40 px-3 py-1 text-xs font-bold">
                              {D.badge}
                            </span>
                          ) : null}
                          {!annule ? (
                            <div className="ml-auto flex gap-4">
                              <Link
                                href={`/app/agenda/${r.id}`}
                                className="text-sm font-semibold text-texte-secondaire hover:text-prune"
                              >
                                Modifier
                              </Link>
                              <form action={annulerRdv}>
                                <input type="hidden" name="id" value={r.id} />
                                <button
                                  type="submit"
                                  className="text-sm font-semibold text-texte-secondaire hover:text-erreur"
                                >
                                  Annuler
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span className="ml-auto text-sm font-semibold">Annulé</span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </>
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
 * Le board les montre validables « en un tap ». Deux boutons, rien entre les
 * deux, et l'information qui permet de décider : à quelle distance, et
 * pourquoi cette cliente est là (A5, le séjour).
 */
async function ADecider({ demandes }: { demandes: Demande[] }) {
  if (demandes.length === 0) return null

  const { pro } = await requirePro()
  const zone = await zoneDuPro(pro.id)

  return (
    <section className="mt-8 rounded-bloc bg-fond p-6">
      <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
        {D.$aEcrire.titre}
      </h2>
      <ul className="mt-4 space-y-3">
        {demandes.map((demande) => (
          <li
            key={demande.id}
            className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-carte border-2 border-trait-discret bg-surface p-5"
          >
            <span className="text-lg font-bold">{nomDe(clienteDe(demande.clients))}</span>
            <span className="text-texte-secondaire">
              {demande.service_name} · {formatEuros(demande.price_cents)}
            </span>
            <span className="font-mono font-bold">
              {jourCourt.format(new Date(demande.starts_at))}
              {' · '}
              {heure.format(new Date(demande.starts_at))}
            </span>
            {demande.address_line1 ? (
              <span className="w-full text-texte-secondaire">
                {demande.address_line1}
                {demande.city ? `, ${demande.city}` : ''}
              </span>
            ) : null}
            {demande.stay_from && demande.stay_to ? (
              <span className="w-full font-semibold">
                {remplir(D.$aEcrire.sejour, {
                  du: jourCourt.format(new Date(`${demande.stay_from}T12:00:00Z`)),
                  au: jourCourt.format(new Date(`${demande.stay_to}T12:00:00Z`)),
                })}
              </span>
            ) : null}
            {demande.out_of_zone ? (
              <span className="w-full font-semibold">{detailHorsZone(demande, zone)}</span>
            ) : null}

            <div className="ml-auto flex gap-3">
              <form action={validerDemande}>
                <input type="hidden" name="id" value={demande.id} />
                <button
                  type="submit"
                  className="tactile rounded-pilule bg-action px-6 font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
                >
                  {D.actions.valider}
                </button>
              </form>
              <form action={refuserDemande}>
                <input type="hidden" name="id" value={demande.id} />
                <button
                  type="submit"
                  className="tactile rounded-pilule border-2 border-trait-discret px-6 font-bold hover:border-erreur hover:text-erreur"
                >
                  {D.actions.refuser}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-texte-secondaire">{D.$aEcrire.prevenir}</p>
    </section>
  )
}

/**
 * De combien la demande sort de la zone.
 *
 * Recalculé à l'affichage plutôt que stocké : la zone du pro change (il ajoute
 * une commune), et un chiffre figé mentirait dès le lendemain.
 */
function detailHorsZone(demande: Demande, zone: Awaited<ReturnType<typeof zoneDuPro>>): string {
  if (demande.lat === null || demande.lng === null) return D.badge
  const ecart = distanceALaZone(zone, { lat: demande.lat, lng: demande.lng })
  if (!ecart) return D.badge
  // Distance routière approchée : la ligne droite sous-estime toujours.
  const km = formatDistance(ecart.distanceKm * FACTEUR_DETOUR)
  return ecart.repere
    ? remplir(D.$aEcrire.horsZoneRepere, { km, repere: ecart.repere })
    : remplir(D.gabarits.horsZoneApresRdv, { km })
}

/** N'accepte qu'une date « AAAA-MM-JJ » plausible ; sinon, aujourd'hui. */
function ancreValide(le: string | undefined): Date {
  if (!le || !/^\d{4}-\d{2}-\d{2}$/.test(le)) return new Date()
  const t = Date.parse(`${le}T12:00:00Z`)
  return Number.isNaN(t) ? new Date() : new Date(t)
}
