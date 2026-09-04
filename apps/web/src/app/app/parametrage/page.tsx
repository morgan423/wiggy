import { resumePrestations, resumeZone, resumeJournees, peutRecevoir } from '@wiggy/core'
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
import { etapesFaites as parcoursFait } from '@/lib/parcours'

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

  // G3 — le parcours d'activation. Tant que la page ne peut pas recevoir de
  // réservation, il passe AVANT tout le reste : c'est la seule chose à faire.
  const faites = await parcoursFait(pro.id)
  const enDemarrage = !peutRecevoir(faites)

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
        {/*
          G3 — l'entrée du parcours guidé. Une pro qui ne peut pas encore
          recevoir de réservation n'a qu'une chose à faire, et elle doit être
          en haut : le hub liste des réglages, le parcours donne un ordre.
        */}
        {enDemarrage ? (
          <RangeeEcran
            principal="Finir de préparer ma page"
            secondaire="Cinq étapes, et tu prends tes premières réservations."
            chevron
            invite
            href="/app/demarrage"
          />
        ) : null}

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
          resume={pro.published ? `wiggy.fr/${pro.slug}` : T.$aEcrire.pasEnLigne}
          chevron={!pro.published}
          href="/app/parametrage/profil"
        >
          {pro.published ? <PastilleEtat>En ligne</PastilleEtat> : null}
        </RangeeEcran>

        {/* Le mot « Activité » descend d'un niveau : il nomme le groupe des
            réglages métier, plus l'onglet. */}
        <EtiquetteSection>{T.$aEcrire.groupeActivite}</EtiquetteSection>
        {/*
          D17 ⑥ — chaque rangée RÉSUME et ouvre sa section (14c).

          Un résumé riche évite d'ouvrir ; un résumé pauvre oblige à ouvrir
          chaque écran pour savoir où on en est, et le hub redevient un menu,
          c'est-à-dire un clic de plus avant l'écran qu'on voulait. Le résumé
          tient sur DEUX lignes alignées à droite, comme la planche : c'est ce
          qui fait tenir « 4 prestations » et « de 45 € à 75 € » dans la largeur
          d'un téléphone, sans avoir à choisir entre les deux.

          Les états vides, eux, n'affichent AUCUN chiffre : ils invitent. La
          richesse vaut pour un compte rempli, pas pour le jour un.
        */}
        <RangeeEcran
          principal="Prestations"
          resume={
            listePrestations.length > 0
              ? resumePrestations(listePrestations).principal
              : 'Ajoute ta première prestation'
          }
          resumeDetail={
            listePrestations.length > 0 ? resumePrestations(listePrestations).detail : undefined
          }
          chevron
          href="/app/parametrage/prestations"
        />
        <RangeeEcran
          principal="Zone d’intervention"
          resume={
            listeCommunes.length > 0
              ? resumeZone(listeCommunes, forfait?.fee_cents).principal
              : '2-3 communes, ta tournée reste logique'
          }
          resumeDetail={
            listeCommunes.length > 0
              ? resumeZone(listeCommunes, forfait?.fee_cents).detail
              : undefined
          }
          chevron
          href="/app/parametrage/zone"
        />
        <RangeeEcran
          principal={T.$aEcrire.journeesEtConges}
          resume={
            listeHoraires.length > 0
              ? resumeJournees(listeHoraires, listeConges).principal
              : 'Choisis tes jours et tes heures'
          }
          resumeDetail={
            listeHoraires.length > 0 ? resumeJournees(listeHoraires, listeConges).detail : undefined
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
