import Link from 'next/link'
import {
  ZONE,
  debutDeJour,
  ajouterJours,
  instantVersHeureLocale,
  formatDistance,
  formatEuros,
  lienGps,
  estAppGps,
  minutesAvantDepart,
  rappelDeDepartPertinent,
  fenetreDeReprise,
  rythmeDeRetourSemaines,
  type AppGps,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requireCapability } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { trajetsDeLaJournee, type Trajets } from '@/lib/tournee'
import { FormRetard } from './retard'
import { EnteteEcran, CorpsEcran, RANGEE } from '@/components/composition'

/**
 * C0, « Ma tournée » : le copilote du jour. Planche 16d.
 *
 * Trois états, et la planche les distingue nettement.
 *
 * ① EN TOURNÉE : le bandeau prune porte le statement, l'avancement en toutes
 * lettres, et le FIL DE PASTILLES qui est le motif trajet de la planche 8a.
 * Dessous, une seule carte détachée par une bordure framboise, celle du
 * prochain rendez-vous, avec ses deux actions ; les suivants suivent en
 * rangées atténuées.
 * ② JOURNÉE BOUCLÉE : le fil entièrement en miel, le statement de célébration
 * et le bilan réel du jour. Jamais d'estimation.
 * ③ JOUR OFF : ni CTA de remplissage ni culpabilisation. Un jour off n'est pas
 * un état d'échec.
 *
 * Distinct de l'agenda (B10) : là c'est la planification, ici c'est le jour
 * vécu. Gaté sur `tour_copilot` (offre 2), vérifié côté serveur.
 *
 * Ce qui n'est pas là et ne s'invente pas : la clôture en un tap (B6) et le SMS
 * « je suis en retard » (C5) appartiennent à la phase 2. L'état d'un
 * rendez-vous se déduit donc de l'heure, pas d'un geste du pro.
 */

const T = copy.agendaTournee
const V = copy.etatsVides

const heure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
const jourSeul = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, weekday: 'long' })

type Etat = 'termine' | 'en-cours' | 'a-venir'

export default async function MaTournee({
  searchParams,
}: {
  searchParams: Promise<{ le?: string; vient_de?: string }>
}) {
  const { pro } = await requireCapability('tour_copilot')
  const { le, vient_de: vientDe } = await searchParams

  const jour = debutDeJour(ancreValide(le))
  const finJour = ajouterJours(jour, 1)
  const maintenant = new Date()

  const supabase = await supabaseServer()
  const { data: rdvs } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, ends_at, service_name, price_cents, status, address_line1, city, lat, lng, client_id, clients(first_name, last_name)',
    )
    .gte('starts_at', jour.toISOString())
    .lt('starts_at', finJour.toISOString())
    .not('status', 'eq', 'cancelled')
    .order('starts_at')

  const journee = rdvs ?? []
  const trajets: Trajets = await trajetsDeLaJournee(journee)

  // C3 : l'application de navigation que la pro utilise déjà, réglée une fois.
  // C7 : la reprise du prochain rendez-vous, à la clôture. C'est LE geste
  // métier réel : la coiffeuse recale presque toujours pendant que la cliente
  // est encore là. On calcule la fenêtre d'après SON rythme, et quand le rythme
  // ne dit rien (moins de trois visites), on propose sans fenêtre plutôt que
  // d'inventer une régularité.
  const reprise = vientDe ? await repriseApresCloture(supabase, vientDe) : null

  const [{ data: reglages }, { data: fiche }] = await Promise.all([
    supabase.from('pro_settings').select('gps_app').eq('pro_id', pro.id).maybeSingle(),
    // G4 : le message de retard appelle une réponse, il porte donc le numéro
    // de la pro. Un sender ID alphanumérique ne se répond pas.
    supabase.from('pros').select('phone').eq('id', pro.id).maybeSingle(),
  ])
  const gpsChoisi = reglages?.gps_app ?? ''
  const appGps: AppGps = estAppGps(gpsChoisi) ? gpsChoisi : 'system'

  const etatDe = (r: (typeof journee)[number]): Etat => {
    if (r.status === 'done') return 'termine'
    if (new Date(r.ends_at) <= maintenant) return 'termine'
    if (new Date(r.starts_at) <= maintenant) return 'en-cours'
    return 'a-venir'
  }

  const restants = journee.filter((r) => etatDe(r) !== 'termine')
  const faits = journee.length - restants.length
  const prochain = restants.length > 0 ? restants[0] : null
  const ensuite = restants.slice(1)
  const bouclee = journee.length > 0 && restants.length === 0

  const veille = instantVersHeureLocale(ajouterJours(jour, -1)).slice(0, 10)
  const lendemain = instantVersHeureLocale(ajouterJours(jour, 1)).slice(0, 10)
  const prenom = pro.display_name.split(' ')[0]

  return (
    <>
      {/*
        Journée bouclée : la planche retire le bandeau prune. La célébration
        occupe l'écran, elle ne partage pas la tête avec un résumé.
      */}
      {bouclee ? null : (
        <EnteteEcran
          variante="jour"
          statement={remplir(T.tournee.statement, { pro: prenom })}
          sousTitre={
            prochain
              ? remplir(T.gabarits.progression, {
                  faits: String(faits),
                  total: String(journee.length),
                  cliente: nomDe(prochain.clients),
                  heure: heure.format(new Date(prochain.starts_at)),
                })
              : undefined
          }
        >
          {journee.length > 0 ? <FilTrajet journee={journee.map(etatDe)} /> : null}
        </EnteteEcran>
      )}

      <CorpsEcran serre>
        {/* C2 : au retour d'une clôture, la première chose à savoir est où l'on
            va maintenant. On le NOMME, plutôt que de laisser chercher. */}
        {vientDe && prochain ? (
          <p className="rounded-champ bg-prune px-3.5 py-2.5 text-[12.5px] font-bold text-texte-sur-plein">
            {remplir(T.$aEcrire.prochainRdv, {
              cliente: nomDe(prochain.clients),
              heure: heure.format(new Date(prochain.starts_at)),
              adresse: prochain.address_line1 ?? prochain.city ?? '',
            })}
          </p>
        ) : null}
        {vientDe && !prochain && !bouclee ? (
          <p className="text-[12.5px] text-texte-attenue">{T.$aEcrire.aucunProchain}</p>
        ) : null}

        {/* C7 : « On cale le prochain ? », en un tap, même prestation. */}
        {reprise ? (
          <Link
            href={reprise.lien}
            className="flex flex-col gap-1 rounded-carte border-2 border-action bg-surface px-3.5 py-3 hover:bg-fond"
          >
            <span className="text-[13.5px] font-bold">{T.$aEcrire.caler}</span>
            <span className="text-[11.5px] text-texte-attenue">{T.$aEcrire.calerAide}</span>
          </Link>
        ) : null}

        {bouclee ? (
          <Bouclee journee={journee} trajets={trajets} />
        ) : journee.length === 0 ? (
          <JourSansRdv jour={jour} lendemain={lendemain} />
        ) : (
          <>
            {prochain ? (
              <ProchainRdv
                rdv={prochain}
                trajets={trajets}
                appGps={appGps}
                prenomPro={prenom}
                telephonePro={fiche?.phone ?? null}
              />
            ) : null}
            {ensuite.map((r) => (
              <div key={r.id} className={`${RANGEE} rounded-[14px] px-3.5 py-[11px] opacity-70`}>
                <Link href={`/app/agenda/${r.id}`} className="text-[12.5px] font-bold">
                  {nomDe(r.clients)} · {heure.format(new Date(r.starts_at))}
                  {r.city ? ` · ${r.city}` : ''}
                </Link>
                <span className="shrink-0 text-[11.5px] text-texte-attenue">
                  {T.tournee.ensuite}
                </span>
              </div>
            ))}
          </>
        )}
        {/* Les flèches de jour ne sont pas sur la planche : le copilote parle
            d'aujourd'hui. Elles restent, en pied et en petit, parce que
            regarder la veille ou le lendemain est un besoin réel. */}
        <nav className="flex justify-between pt-2 text-[12px] font-bold text-texte-attenue">
          <Link href={`/app/tournee?le=${veille}`} className="hover:text-prune">
            ‹ Veille
          </Link>
          <Link href={`/app/tournee?le=${lendemain}`} className="hover:text-prune">
            Lendemain ›
          </Link>
        </nav>
      </CorpsEcran>
    </>
  )
}

/**
 * Le fil de pastilles : le motif trajet de la planche 8a, porté en avancement.
 *
 * Fait en miel plein, en cours en anneau abricot, à venir en anneau doux ; le
 * segment qui reste à parcourir est pointillé, celui qui l'est déjà est plein.
 * C'est la seule figure de la planche qui dit d'un coup d'œil où en est la
 * journée.
 */
function FilTrajet({ journee }: { journee: Etat[] }) {
  return (
    <span aria-hidden className="flex items-center pt-1.5">
      {journee.map((etat, i) => (
        <span key={i} className="flex items-center">
          {i > 0 ? (
            <span
              className={`h-[2.5px] w-[30px] ${
                journee[i - 1] === 'termine' ? 'bg-celebration' : 'trait-pointille'
              }`}
            />
          ) : null}
          <span
            className={`size-3 rounded-pilule ${
              etat === 'termine'
                ? 'bg-celebration'
                : etat === 'en-cours'
                  ? 'border-[2.5px] border-attente'
                  : 'border-[2.5px] border-texte-sur-plein-doux'
            }`}
          />
        </span>
      ))}
    </span>
  )
}

/**
 * La carte du prochain rendez-vous : la seule de l'écran à porter une bordure
 * framboise. C'est la question à laquelle le pro vient chercher une réponse,
 * il ne doit pas la chercher.
 */
function ProchainRdv({
  rdv,
  trajets,
  appGps,
  prenomPro,
  telephonePro,
}: {
  rdv: {
    id: string
    starts_at: string
    service_name: string
    address_line1: string | null
    city: string | null
    lat: number | null
    lng: number | null
    clients: unknown
  }
  trajets: Trajets
  appGps: AppGps
  prenomPro: string
  telephonePro: string | null
}) {
  const trajet = trajets.get(rdv.id)
  const lieu = [rdv.address_line1, rdv.city].filter(Boolean).join(', ')
  const maintenant = new Date()
  const debut = new Date(rdv.starts_at)

  // C4 — quand PARTIR, jamais combien de temps il reste. « Il reste 25 minutes »
  // n'aide personne quand la route en prend 30.
  const minutesAvant = trajet
    ? minutesAvantDepart({ debutRdv: debut, minutesTrajet: trajet.minutes, maintenant })
    : null
  const departPertinent =
    minutesAvant !== null && trajet ? rappelDeDepartPertinent(minutesAvant, trajet.minutes) : false

  return (
    <div className="flex flex-col gap-2 rounded-carte border-2 border-action bg-surface px-3.5 py-[13px]">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[13.5px] font-bold">
          {nomDe(rdv.clients)} · {heure.format(new Date(rdv.starts_at))}
        </span>
        {trajet ? (
          <span className="shrink-0 text-[11.5px] font-bold text-texte-secondaire">
            {remplir(T.gabarits.route, { min: String(trajet.minutes) })}
          </span>
        ) : null}
      </div>
      <p className="text-[12px] text-texte-attenue">
        {rdv.service_name}
        {lieu ? ` · ${lieu}` : ` · ${T.$aEcrire.sansAdresse}`}
      </p>
      {/* C4 : le rappel de départ, lié au trajet réel. Il ne parle que dans sa
          fenêtre : trop tôt il devient du bruit qu'on apprend à ignorer. */}
      {departPertinent && minutesAvant !== null ? (
        <p className="rounded-champ bg-celebration px-3 py-2 text-[12.5px] font-bold text-texte-sur-miel">
          {minutesAvant > 0
            ? remplir(T.$aEcrire.departDans, {
                min: String(minutesAvant),
                cliente: nomDe(rdv.clients),
              })
            : minutesAvant === 0
              ? remplir(T.$aEcrire.departMaintenant, { cliente: nomDe(rdv.clients) })
              : remplir(T.$aEcrire.departEnRetard, {
                  min: String(-minutesAvant),
                  cliente: nomDe(rdv.clients),
                })}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {/* C3 : un tap ouvre l'application que la pro utilise déjà. Aucune
            navigation embarquée, jamais : c'est une règle de la ligne. */}
        {rdv.lat !== null && rdv.lng !== null ? (
          <a
            href={lienGps(appGps, { lat: rdv.lat, lng: rdv.lng }, nomDe(rdv.clients))}
            rel="noopener noreferrer"
            target="_blank"
            className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
          >
            {T.tournee.gps}
          </a>
        ) : null}
        {/* C5 : le message se prévisualise et se valide. Il ne part jamais seul. */}
        <FormRetard
          id={rdv.id}
          cliente={nomDe(rdv.clients)}
          prenomPro={prenomPro}
          telephonePro={telephonePro}
          minutesTrajet={trajet?.minutes ?? null}
        />
        <Link
          href={`/app/agenda/${rdv.id}`}
          className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[13px] font-bold hover:border-prune"
        >
          {T.prochain.fiche}
        </Link>
      </div>
    </div>
  )
}

/**
 * La journée bouclée : la célébration 13b, une fois par jour au maximum.
 *
 * Le bilan reprend les compteurs RÉELS du jour. Aucune estimation : un chiffre
 * inventé dans une célébration est un mensonge que la pro croira.
 */
function Bouclee({ journee, trajets }: { journee: { price_cents: number }[]; trajets: Trajets }) {
  const km = [...trajets.values()].reduce((somme, t) => somme + t.km, 0)
  const encaisse = journee.reduce((somme, r) => somme + r.price_cents, 0)

  return (
    <div className="flex flex-col gap-2.5 py-2">
      <FilBoucle n={journee.length} />
      <h1 className="statement-ecran">{T.tournee.bouclee}</h1>
      <div className="flex justify-between rounded-carte bg-surface px-3.5 py-[13px] text-[12.5px] font-bold">
        <span>{remplir(T.gabarits.nRdv, { n: String(journee.length) })}</span>
        <span>{km > 0 ? formatDistance(km) : '0 km'}</span>
        <span>{formatEuros(encaisse)}</span>
      </div>
    </div>
  )
}

/** Le fil de la planche, entièrement en miel : tout est fait. */
function FilBoucle({ n }: { n: number }) {
  return (
    <span aria-hidden className="flex items-center px-0.5 py-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex items-center">
          {i > 0 ? <span className="h-[2.5px] w-[42px] bg-celebration" /> : null}
          <span className="size-3 rounded-pilule bg-celebration" />
        </span>
      ))}
    </span>
  )
}

/**
 * Le jour off. Pas de CTA de remplissage, pas de culpabilisation : la planche
 * est explicite, un jour sans rendez-vous n'est pas un échec.
 *
 * ⚠️ Écart signalé : la planche annonce la prochaine tournée (« jeudi, 2
 * rendez-vous à Rezé »). Il faudrait interroger les jours suivants pour
 * l'écrire sans mentir ; en attendant, on propose simplement d'aller voir le
 * lendemain plutôt que d'annoncer un chiffre qu'on n'a pas.
 */
function JourSansRdv({ jour, lendemain }: { jour: Date; lendemain: string }) {
  return (
    <div className="my-auto flex flex-col gap-2.5 py-6 text-center">
      <p className="text-[14px] font-bold">
        {remplir(T.gabarits.jourOff, { jour: jourSeul.format(jour) })}
      </p>
      <p className="text-[12.5px] leading-[1.5] text-texte-attenue">{V.agendaVide.invitation}</p>
      <Link
        href={`/app/tournee?le=${lendemain}`}
        className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[12.5px] font-bold hover:border-prune"
      >
        {T.$aEcrire.voirLendemain}
      </Link>
    </div>
  )
}

function nomDe(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Sans fiche'
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return 'Sans fiche'
  const nom = typeof c.last_name === 'string' ? c.last_name : ''
  return `${c.first_name} ${nom}`.trim()
}

/** N'accepte qu'une date « AAAA-MM-JJ » plausible ; sinon, aujourd'hui. */
function ancreValide(le: string | undefined): Date {
  if (!le || !/^\d{4}-\d{2}-\d{2}$/.test(le)) return new Date()
  const t = Date.parse(`${le}T12:00:00Z`)
  return Number.isNaN(t) ? new Date() : new Date(t)
}

/**
 * C7 — ce qu'il faut pour reproposer un rendez-vous à la cliente qu'on vient de
 * quitter.
 *
 * Le rythme vient de `fiche.ts` et ne se prononce pas avant trois visites. Sans
 * lui, on ouvre la création sans date suggérée : la pro choisira, et c'est très
 * bien. Ce qu'on ne fait pas, c'est proposer « dans cinq semaines » à quelqu'un
 * qu'on a vu deux fois.
 */
async function repriseApresCloture(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  rdvId: string,
): Promise<{ lien: string } | null> {
  const { data: rdv } = await supabase
    .from('appointments')
    .select('client_id, service_id, starts_at')
    .eq('id', rdvId)
    .maybeSingle()
  if (!rdv?.client_id || !rdv.service_id) return null

  const { data: historique } = await supabase
    .from('appointments')
    .select('starts_at, status')
    .eq('client_id', rdv.client_id)
  const visites = (historique ?? []).map((r) => ({
    debut: new Date(r.starts_at),
    annulee: r.status === 'cancelled',
  }))

  const fenetre = fenetreDeReprise({
    rythmeSemaines: rythmeDeRetourSemaines(visites),
    depuis: new Date(rdv.starts_at),
  })
  const params = new URLSearchParams({ cliente: rdv.client_id, prestation: rdv.service_id })
  if (fenetre) params.set('vers', instantVersHeureLocale(fenetre.debut).slice(0, 10))
  return { lien: `/app/agenda/nouveau?${params.toString()}` }
}
