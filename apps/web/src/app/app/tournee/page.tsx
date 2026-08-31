import Link from 'next/link'
import {
  ZONE,
  debutDeJour,
  ajouterJours,
  instantVersHeureLocale,
  formatDistance,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requireCapability } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { trajetsDeLaJournee, libelleTrajet, type Trajets } from '@/lib/tournee'

/**
 * C0 : « Ma tournée ». L'écran que le pro ouvre trente fois par jour.
 *
 * Distinct de l'agenda (B10) : là c'est la planification, ici c'est le jour
 * vécu. La journée se lit de haut en bas, avec les trajets entre les
 * rendez-vous : c'est ce qui matérialise la promesse « ta journée en tournée
 * logique ».
 *
 * Gaté sur `tour_copilot` (offre 2), vérifié côté serveur.
 *
 * Ce qui n'est pas là et ne s'invente pas : la clôture en un tap (B6) et le
 * bouton « je suis en retard » (C5) appartiennent à la phase 2. L'état d'un
 * rendez-vous se déduit donc de l'heure, pas d'un geste du pro.
 */

const T = copy.agendaTournee
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

type Etat = 'termine' | 'en-cours' | 'a-venir'

export default async function MaTournee({
  searchParams,
}: {
  searchParams: Promise<{ le?: string }>
}) {
  await requireCapability('tour_copilot')
  const { le } = await searchParams

  const jour = debutDeJour(ancreValide(le))
  const finJour = ajouterJours(jour, 1)
  const maintenant = new Date()

  const supabase = await supabaseServer()
  const { data: rdvs } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, ends_at, service_name, status, address_line1, city, lat, lng, client_id, clients(first_name, last_name)',
    )
    .gte('starts_at', jour.toISOString())
    .lt('starts_at', finJour.toISOString())
    .not('status', 'eq', 'cancelled')
    .order('starts_at')

  const journee = rdvs ?? []
  const trajets: Trajets = await trajetsDeLaJournee(journee)

  const etatDe = (r: (typeof journee)[number]): Etat => {
    if (r.status === 'done') return 'termine'
    if (new Date(r.ends_at) <= maintenant) return 'termine'
    if (new Date(r.starts_at) <= maintenant) return 'en-cours'
    return 'a-venir'
  }

  const restants = journee.filter((r) => etatDe(r) !== 'termine')
  const prochain = restants.length > 0 ? restants[0] : null
  const kmTotal = [...trajets.values()].reduce((somme, t) => somme + t.km, 0)
  const veille = instantVersHeureLocale(ajouterJours(jour, -1)).slice(0, 10)
  const lendemain = instantVersHeureLocale(ajouterJours(jour, 1)).slice(0, 10)

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">{T.titre}</h1>
        <p className="text-lg font-semibold text-texte-secondaire capitalize">
          {jourLong.format(jour)}
        </p>
      </div>

      {journee.length > 0 ? (
        <p className="mt-3 text-lg font-bold">
          {remplir(T.gabarits.resume, {
            n: String(journee.length),
            km: kmTotal > 0 ? formatDistance(kmTotal) : '0 km',
          })}
        </p>
      ) : null}

      <nav className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold">
        <Link
          href={`/app/tournee?le=${veille}`}
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          ← Veille
        </Link>
        <Link
          href="/app/tournee"
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          Aujourd’hui
        </Link>
        <Link
          href={`/app/tournee?le=${lendemain}`}
          className="tactile rounded-pilule border-2 border-trait-discret px-4 hover:border-prune"
        >
          Lendemain →
        </Link>
      </nav>

      {journee.length === 0 ? (
        <section className="mt-10 rounded-bloc bg-fond p-8">
          <h2 className="text-2xl font-extrabold tracking-tight">{V.agendaVide.titre}</h2>
          <p className="mt-3 text-texte-secondaire">{V.agendaVide.invitation}</p>
          <Link
            href="/app/parametrage/profil"
            className="tactile mt-6 rounded-pilule bg-action px-8 font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
          >
            {V.agendaVide.bouton}
          </Link>
        </section>
      ) : (
        <>
          {/* Le prochain rendez-vous en tête : c'est la question à laquelle le
              pro vient chercher une réponse, il ne doit pas la chercher. */}
          {prochain ? (
            <section className="mt-8 rounded-bloc bg-prune p-6 text-texte-sur-plein">
              <p className="text-sm font-bold tracking-widest uppercase opacity-80">
                {T.prochain.titre}
              </p>
              <p className="mt-2 text-2xl font-extrabold">
                {nomDe(prochain.clients)} · {heure.format(new Date(prochain.starts_at))}
              </p>
              <p className="mt-1 opacity-90">
                {prochain.address_line1
                  ? detailProchain(prochain, trajets)
                  : T.$aEcrire.sansAdresse}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {prochain.lat !== null && prochain.lng !== null ? (
                  <a
                    href={lienGps(prochain.lat, prochain.lng)}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="tactile rounded-pilule bg-celebration px-6 font-bold text-texte-sur-miel"
                  >
                    {T.prochain.trajet}
                  </a>
                ) : null}
                <Link
                  href={`/app/agenda/${prochain.id}`}
                  className="tactile rounded-pilule border-2 border-texte-sur-plein px-6 font-bold"
                >
                  {T.prochain.fiche}
                </Link>
              </div>
            </section>
          ) : null}

          <ol className="mt-8">
            {journee.map((r) => {
              const trajet = trajets.get(r.id)
              const etat = etatDe(r)
              return (
                <li key={r.id}>
                  {trajet ? (
                    <p className="flex items-center gap-3 py-2 pl-5 text-sm font-semibold text-texte-secondaire">
                      <span aria-hidden className="trait-trajet" />
                      {libelleTrajet(trajet)}
                    </p>
                  ) : null}
                  <Link
                    href={`/app/agenda/${r.id}`}
                    className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-carte border-2 p-5 hover:border-prune ${
                      etat === 'termine'
                        ? 'border-trait-discret text-texte-secondaire'
                        : etat === 'en-cours'
                          ? 'border-attente bg-attente/15'
                          : 'border-trait-discret'
                    }`}
                  >
                    <span className="font-mono text-lg font-bold">
                      {heure.format(new Date(r.starts_at))}
                    </span>
                    <span className="text-lg font-bold">{nomDe(r.clients)}</span>
                    <span className="text-texte-secondaire">
                      {r.service_name}
                      {r.address_line1 ? ` · ${r.address_line1}` : ''}
                    </span>
                    <span className="ml-auto rounded-pilule bg-fond px-3 py-1 text-xs font-bold">
                      {etat === 'termine'
                        ? T.etats.termine
                        : etat === 'en-cours'
                          ? T.etats.enCours
                          : T.$aEcrire.aVenir}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>

          {restants.length > 0 ? (
            <p className="mt-8 text-lg font-bold">
              {remplir(T.gabarits.restant, { n: String(restants.length) })}
            </p>
          ) : null}
        </>
      )}
    </>
  )
}

type RdvTournee = {
  id: string
  address_line1: string | null
  clients: unknown
}

function detailProchain(rdv: RdvTournee & { address_line1: string | null }, trajets: Trajets) {
  const trajet = trajets.get(rdv.id)
  const adresse = rdv.address_line1 ?? ''
  return trajet
    ? remplir(T.gabarits.prochainDetail, { adresse, min: String(trajet.minutes) })
    : adresse
}

/**
 * Lien de navigation. Sur cette surface web, l'URL universelle de Google Maps
 * est la seule qui s'ouvre partout, y compris dans l'application native quand
 * elle est installée. Le respect du réglage `gps_app` du pro (Waze, Plans)
 * demande des liens natifs : c'est C2/C4, dans l'app mobile.
 */
function lienGps(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function nomDe(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Sans cliente'
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return 'Sans cliente'
  const nom = typeof c.last_name === 'string' ? c.last_name : ''
  return `${c.first_name} ${nom}`.trim()
}

/** N'accepte qu'une date « AAAA-MM-JJ » plausible ; sinon, aujourd'hui. */
function ancreValide(le: string | undefined): Date {
  if (!le || !/^\d{4}-\d{2}-\d{2}$/.test(le)) return new Date()
  const t = Date.parse(`${le}T12:00:00Z`)
  return Number.isNaN(t) ? new Date() : new Date(t)
}
