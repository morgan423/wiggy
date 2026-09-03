import { formatEuros } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { IconesEntete } from '@/components/icones-entete'
import {
  EnteteEcran,
  CorpsEcran,
  RangeeEcran,
  RangeeAVenir,
  EtiquetteSection,
  PastilleEtat,
} from '@/components/composition'
import { Avatar } from '@/components/avatar'

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
const T = copy.agendaTournee

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
      {/*
        D17 — l'onglet se structure autour de la PRO, plus autour de ses
        réglages : avatar et prénom en tête, puis « Voir ma page publique » en
        PREMIER accès. Elle était la dernière rangée et s'affichait comme une
        URL ; c'est pourtant ce que la pro vient montrer, partager et vérifier.
      */}
      <EnteteEcran
        variante="hub"
        cloche={<IconesEntete />}
        vignette={<Avatar nom={pro.display_name} taille="sm" />}
        statement={pro.display_name.split(' ')[0]}
        sousTitre={
          pret
            ? 'Tout est modifiable, à tout moment.'
            : `${String(3 - etapesFaites)} étapes et ta page prend ses premières réservations.`
        }
      />
      <CorpsEcran>
        {aVerifier.length > 0 ? (
          <RangeeEcran
            principal={
              aVerifier.length === 2
                ? A.$aEcrire.inviteVerification
                : remplir(A.$aEcrire.invitePartielle, { reste: aVerifier[0] })
            }
            chevron
            invite
            href={verifs?.phone_verified_at ? '/verification/email' : '/verification/telephone'}
          />
        ) : null}

        <RangeeEcran
          principal={T.$aEcrire.voirMaPage}
          resume={pro.published ? undefined : T.$aEcrire.pasEnLigne}
          chevron={!pro.published}
          href="/app/parametrage/profil"
        >
          {pro.published ? <PastilleEtat>En ligne</PastilleEtat> : null}
        </RangeeEcran>

        {/* Le mot « Activité » descend d'un niveau : il nomme le groupe des
            réglages métier, plus l'onglet. */}
        <EtiquetteSection>{T.$aEcrire.groupeActivite}</EtiquetteSection>
        <RangeeEcran
          principal="Prestations"
          resume={
            listePrestations.length > 0
              ? fourchette(listePrestations)
              : 'Ajoute ta première prestation'
          }
          chevron
          href="/app/parametrage/prestations"
        />
        <RangeeEcran
          principal="Zone d’intervention"
          resume={
            listeCommunes.length > 0
              ? forfait
                ? `${nomsDeCommunes(listeCommunes)} · base ${formatEuros(forfait.fee_cents)}`
                : nomsDeCommunes(listeCommunes)
              : '2-3 communes, ta tournée reste logique'
          }
          chevron
          href="/app/parametrage/zone"
        />
        <RangeeEcran
          principal={T.$aEcrire.journeesEtConges}
          resume={
            listeHoraires.length > 0
              ? listeConges.length > 0
                ? `${joursTravailles(listeHoraires)} · ${String(listeConges.length)} congé${listeConges.length > 1 ? 's' : ''}`
                : joursTravailles(listeHoraires)
              : 'Choisis tes jours et tes heures'
          }
          chevron
          href="/app/parametrage/horaires"
        />
        {/*
          D17 ④ — le métier en bas, le compte en haut. Cet onglet garde ce qui
          fait TOURNER l'activité ; le paiement, l'abonnement, le compte, le
          paramétrage, l'aide et la déconnexion vivent dans le menu, en haut à
          droite.

          « Voir ma page publique » RESTE ici, et pas dans le menu : c'est un
          geste fréquent et fier, on regarde sa vitrine, ça ne se cache pas
          derrière une icône.
        */}
        <RangeeAVenir principal={T.$aEcrire.statistiques} mention={T.$aEcrire.aVenir} />
      </CorpsEcran>
    </>
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
