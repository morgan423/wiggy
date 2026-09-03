import Link from 'next/link'
import { formatEuros, ZONE } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import {
  EnteteEcran,
  CorpsEcran,
  RangeeEcran,
  EtiquetteSection,
  PastilleEtat,
  RANGEE,
} from '@/components/composition'
import { seDeconnecter } from '@/app/(pro)/actions'

/**
 * Le hub « Ton activité », planche 14c.
 *
 * Deux compositions, et la planche les distingue nettement.
 *
 * ① JOUR UN : aucune étiquette de section, trois rangées qui invitent, chacune
 * avec sa pastille framboise « + » à droite, et « Ma Page » atténuée à 55 %
 * parce qu'elle s'ouvre après les trois autres. L'état vide invite, il
 * n'affiche aucun zéro. Les congés sont absents du jour un.
 *
 * ② REMPLI : une étiquette par section, et une rangée d'une seule ligne dont le
 * RÉSUMÉ EST À DROITE, sur la même ligne. C'est ce qui fait la densité de la
 * planche. Chaque rangée résume et ouvre sa section : le hub ne permet aucune
 * édition directe.
 *
 * Tous les chiffres viennent de la base. Aucun n'est inventé.
 */

const A = copy.authentification

const jourCourt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  day: 'numeric',
  month: 'long',
})

export default async function Parametrage() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()

  const [prestations, communes, horaires, conges] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_min, active')
      .order('position')
      .order('name'),
    supabase.from('service_area_communes').select('insee_code, name').order('name'),
    supabase.from('working_hours').select('weekday, starts_at, ends_at').order('weekday'),
    supabase.from('time_off').select('id, starts_at, ends_at, label').order('starts_at'),
  ])

  // D9 : tant que les deux vérifications manquent, la rangée d'invite reste
  // dans le hub et la mise en ligne est désactivée. On nomme ce qui manque
  // plutôt que de dire « incomplet ».
  const { data: verifs } = await supabase
    .from('pros')
    .select('phone_verified_at')
    .eq('id', pro.id)
    .maybeSingle()
  const aVerifier = [
    auth.user?.email_confirmed_at ? null : 'ton e-mail',
    verifs?.phone_verified_at ? null : 'ton téléphone',
  ].filter((m): m is string => m !== null)

  const listePrestations = prestations.data ?? []
  const listeCommunes = communes.data ?? []
  const listeHoraires = horaires.data ?? []
  const listeConges = conges.data ?? []

  // Les trois étapes de la planche 14c : prestations, zone, journées. Ma Page
  // ne s'ouvre qu'après elles.
  const etapesFaites = [listePrestations, listeCommunes, listeHoraires].filter(
    (l) => l.length > 0,
  ).length
  const pret = etapesFaites === 3

  // A8 : le forfait de base vit sur la ligne `from_km = 0`. Il ne sort jamais
  // côté cliente ; ici, il informe la pro de ce qu'elle proposera.
  const { data: forfait } = await supabase
    .from('distance_fees')
    .select('fee_cents')
    .eq('from_km', 0)
    .maybeSingle()

  return (
    <>
      <EnteteEcran
        variante="hub"
        statement="Ton activité."
        sousTitre={
          pret
            ? 'Tout est modifiable, à tout moment.'
            : `${String(3 - etapesFaites)} étapes et ta page prend ses premières réservations.`
        }
      />
      <CorpsEcran>
        {/*
          D9 : tant qu'une vérification manque, l'invite reste en tête du hub.
          La planche 14b la prescrit (« rangée d'invite dans le hub 14c ») sans
          la dessiner : rangée ordinaire, en tête, jamais un bandeau d'alerte.
        */}
        {aVerifier.length > 0 ? (
          <RangeeEcran
            principal={
              aVerifier.length === 2
                ? A.$aEcrire.inviteVerification
                : remplir(A.$aEcrire.invitePartielle, { reste: aVerifier[0] })
            }
            chevron
            href={verifs?.phone_verified_at ? '/verification/email' : '/verification/telephone'}
          />
        ) : null}

        {pret ? (
          <>
            <EtiquetteSection>Prestations</EtiquetteSection>
            <RangeeEcran
              principal={`${String(listePrestations.length)} prestation${listePrestations.length > 1 ? 's' : ''}`}
              resume={fourchette(listePrestations)}
              chevron
              href="/app/parametrage/prestations"
            />

            <EtiquetteSection>Zone d’intervention</EtiquetteSection>
            <RangeeEcran
              principal={nomsDeCommunes(listeCommunes)}
              resume={forfait ? `hors zone : base ${formatEuros(forfait.fee_cents)}` : undefined}
              chevron
              href="/app/parametrage/zone"
            />

            <EtiquetteSection>Journées &amp; congés</EtiquetteSection>
            <RangeeEcran
              principal={`${joursTravailles(listeHoraires)} · ${plageCommune(listeHoraires)}`}
              chevron
              href="/app/parametrage/horaires"
            />
            <RangeeEcran
              principal={
                listeConges.length > 0
                  ? `Congés : ${jourCourt.format(new Date(listeConges[0].starts_at))} au ${jourCourt.format(new Date(listeConges[0].ends_at))}`
                  : 'Aucun congé posé'
              }
              resume={
                listeConges.length > 1 ? `+ ${String(listeConges.length - 1)} autres` : undefined
              }
              chevron
              href="/app/parametrage/conges"
            />

            <EtiquetteSection>Ma Page</EtiquetteSection>
            <RangeeEcran
              principal={pro.published ? `wiggy.fr/${pro.slug}` : 'Ma Page'}
              href="/app/parametrage/profil"
              chevron={!pro.published}
              resume={pro.published ? undefined : 'prête à être mise en ligne'}
            >
              {pro.published ? <PastilleEtat>En ligne</PastilleEtat> : null}
            </RangeeEcran>
          </>
        ) : (
          <>
            <RangeeInvite
              titre="Ce que tu proposes"
              invitation="Ajoute ta première prestation"
              href="/app/parametrage/prestations"
              fait={listePrestations.length > 0}
              resume={
                listePrestations.length > 0
                  ? `${String(listePrestations.length)} prestation${listePrestations.length > 1 ? 's' : ''}`
                  : undefined
              }
            />
            <RangeeInvite
              titre="Où tu te déplaces"
              invitation="2-3 communes, ta tournée reste logique"
              href="/app/parametrage/zone"
              fait={listeCommunes.length > 0}
              resume={listeCommunes.length > 0 ? nomsDeCommunes(listeCommunes) : undefined}
            />
            <RangeeInvite
              titre="Tes journées de travail"
              invitation="Choisis tes jours et tes heures"
              href="/app/parametrage/horaires"
              fait={listeHoraires.length > 0}
              resume={listeHoraires.length > 0 ? joursTravailles(listeHoraires) : undefined}
            />
            {/* Ma Page reste atténuée tant que les trois étapes ne sont pas
                posées : la planche la montre à 55 %, sans chevron. */}
            <div className={`${RANGEE} items-start opacity-55`}>
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold">Ma Page</span>
                <span className="text-[12px] text-texte-attenue">
                  S’ouvre après tes 3 premières étapes
                </span>
              </span>
            </div>
          </>
        )}

        {/*
          La déconnexion vivait dans la barre du haut, supprimée par D12. Sa
          place est ici : le hub est l'écran du compte, et la planche 14c n'en
          montre aucune autre. Discrète, en fin de colonne.
        */}
        <form action={seDeconnecter} className="mt-auto pt-8 pb-3.5">
          <button
            type="submit"
            className="tactile text-[12px] font-bold text-texte-attenue hover:text-erreur"
          >
            Se déconnecter
          </button>
        </form>
      </CorpsEcran>
    </>
  )
}

/**
 * La rangée du jour un : le libellé, ce qu'elle attend, et la pastille
 * framboise « + » de 26 px à droite (planche 14c). Une fois l'étape faite, la
 * pastille cède la place au résumé : c'est la même rangée qui se remplit.
 */
function RangeeInvite({
  titre,
  invitation,
  href,
  fait,
  resume,
}: {
  titre: string
  invitation: string
  href: string
  fait: boolean
  resume?: string
}) {
  return (
    <Link href={href} className={`${RANGEE} items-start hover:bg-fond`}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-bold">{titre}</span>
        <span className="text-[12px] text-texte-attenue">{fait ? resume : invitation}</span>
      </span>
      {fait ? (
        <span aria-hidden className="shrink-0 text-[12px] text-texte-attenue">
          ›
        </span>
      ) : (
        <span
          aria-hidden
          className="flex size-[26px] shrink-0 items-center justify-center rounded-pilule bg-action font-extrabold text-texte-sur-plein"
        >
          +
        </span>
      )}
    </Link>
  )
}

/** « de 28 € à 75 € », comme la planche. Une seule prestation ne fait pas une fourchette. */
function fourchette(prestations: { price_cents: number }[]): string {
  const prix = prestations.map((p) => p.price_cents)
  const mini = Math.min(...prix)
  const maxi = Math.max(...prix)
  return mini === maxi ? formatEuros(mini) : `de ${formatEuros(mini)} à ${formatEuros(maxi)}`
}

/**
 * « Nantes, Rezé, Vertou », puis « + N communes » au-delà de trois.
 *
 * Jamais d'ellipsis sur un nom de commune : la planche 14c est explicite, une
 * commune coupée en deux ne se reconnaît plus.
 */
function nomsDeCommunes(communes: { name: string }[]): string {
  const noms = communes.map((c) => c.name)
  if (noms.length <= 3) return noms.join(', ')
  return `${noms.slice(0, 2).join(', ')} + ${String(noms.length - 2)} communes`
}

const ABREGE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** « Lun a Sam » quand les jours se suivent, sinon la liste. */
function joursTravailles(horaires: { weekday: number }[]): string {
  const jours = [...new Set(horaires.map((h) => h.weekday))].sort((a, b) => a - b)
  if (jours.length === 0) return 'Aucun jour'
  const continu = jours.every((j, i) => i === 0 || j === jours[i - 1] + 1)
  if (continu && jours.length > 2) {
    return `${ABREGE[jours[0]]} à ${ABREGE[jours[jours.length - 1]]}`
  }
  return jours.map((j) => ABREGE[j]).join(', ')
}

/** La plage commune, ou le nombre de plages différentes s'il y en a plusieurs. */
function plageCommune(horaires: { starts_at: string; ends_at: string }[]): string {
  const plages = [
    ...new Set(horaires.map((h) => `${h.starts_at.slice(0, 5)} à ${h.ends_at.slice(0, 5)}`)),
  ]
  return plages.length === 1 ? plages[0] : `${String(plages.length)} plages différentes`
}
