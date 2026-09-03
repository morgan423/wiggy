import { formatEuros } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { Cloche } from '@/components/cloche'
import {
  EnteteEcran,
  CorpsEcran,
  RangeeEcran,
  RangeeAVenir,
  EtiquetteSection,
  PastilleEtat,
} from '@/components/composition'
import { Avatar } from '@/components/avatar'
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
        cloche={<Cloche />}
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
        {/* 17c : le mode d'exercice et le GPS restent MÉTIER. Ils disent
            comment la pro travaille, pas comment elle est facturée. */}
        <RangeeEcran principal={T.$aEcrire.exercice} chevron href="/app/parametrage/exercice" />

        <EtiquetteSection>{T.$aEcrire.groupeCompte}</EtiquetteSection>
        {/*
          D17 : l'écran de réglages était un grenier, sept réglages sans rapport
          les uns avec les autres. Ils sont répartis par sujet : le paiement et
          la validation ici, le tampon nouvelle cliente avec les journées, le
          GPS avec la zone, les SMS avec les notifications.
        */}
        <RangeeEcran principal={T.$aEcrire.paiement} chevron href="/app/parametrage/paiement" />
        <RangeeEcran principal={T.$aEcrire.annulation} chevron href="/app/parametrage/annulation" />
        {/* 17c : les SMS rejoignent l'abonnement, avec l'offre. Rattaché au
            hub, aussi : il n'était atteignable que par une redirection de
            capacité, donc jamais quand on le cherchait. */}
        <RangeeEcran
          principal={T.$aEcrire.abonnement}
          resume={T.$aEcrire.abonnementResume}
          chevron
          href="/app/abonnement"
        />
        {/* B14 : la planche 17c ne montre pas cette rangée, mais le brief
            demande de poser les bascules push dans Profil. Écart signalé. */}
        <RangeeEcran
          principal={T.$aEcrire.notifications}
          chevron
          href="/app/parametrage/notifications"
        />
        <RangeeAVenir principal={T.$aEcrire.statistiques} mention={T.$aEcrire.aVenir} />
        <RangeeAVenir principal={T.$aEcrire.aide} mention={T.$aEcrire.aVenir} />

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
