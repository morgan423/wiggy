import { formatEuros, ZONE } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CarteEcran, EtiquetteSection } from '@/components/composition'
import { seDeconnecter } from '@/app/(pro)/actions'

/**
 * Le hub « Ton activité », planche 10c du board.
 *
 * Le board montre une carte unique qui regroupe prestations, zone, horaires et
 * congés, chacune en section, avec l'état courant lisible d'un coup d'œil. Les
 * écrans d'édition subsistent derrière chaque section : ils ne sont pas
 * supprimés, ils cessent d'être le point d'entrée.
 *
 * Tous les chiffres viennent de la base. Aucun n'est inventé, et un réglage
 * vide affiche l'état vide de la planche 7b plutôt qu'un zéro sans contexte.
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
        statement="Ton activité."
        sousTitre={
          pret
            ? 'Tout est modifiable, à tout moment.'
            : `${String(3 - etapesFaites)} étapes et ta page prend ses premières réservations.`
        }
      />

      {aVerifier.length > 0 ? (
        <CarteEcran
          principal={
            aVerifier.length === 2
              ? A.$aEcrire.inviteVerification
              : remplir(A.$aEcrire.invitePartielle, { reste: aVerifier[0] })
          }
          chevron
          href={verifs?.phone_verified_at ? '/verification/email' : '/verification/telephone'}
        />
      ) : null}

      {/*
        Une rangée par section : elle RÉSUME et ouvre, le hub ne permet aucune
        édition directe (planche 14c). L'état vide invite et n'affiche aucun
        zéro : « Ajoute ta première prestation », jamais « 0 prestation ».
      */}
      <EtiquetteSection>Prestations</EtiquetteSection>
      <CarteEcran
        principal={
          listePrestations.length > 0
            ? `${String(listePrestations.length)} prestation${listePrestations.length > 1 ? 's' : ''}`
            : 'Ce que tu proposes'
        }
        secondaire={
          listePrestations.length > 0
            ? fourchette(listePrestations)
            : 'Ajoute ta première prestation'
        }
        chevron
        href="/app/parametrage/prestations"
      />

      <EtiquetteSection>Zone d’intervention</EtiquetteSection>
      <CarteEcran
        principal={listeCommunes.length > 0 ? nomsDeCommunes(listeCommunes) : 'Où tu te déplaces'}
        secondaire={
          listeCommunes.length > 0
            ? forfait
              ? `hors zone : base ${formatEuros(forfait.fee_cents)}`
              : 'hors zone : demande sous réserve'
            : '2-3 communes, ta tournée reste logique'
        }
        chevron
        href="/app/parametrage/zone"
      />

      <EtiquetteSection>Journées & congés</EtiquetteSection>
      <CarteEcran
        principal={
          listeHoraires.length > 0 ? joursTravailles(listeHoraires) : 'Tes journées de travail'
        }
        secondaire={
          listeHoraires.length > 0 ? plageCommune(listeHoraires) : 'Choisis tes jours et tes heures'
        }
        chevron
        href="/app/parametrage/horaires"
      />
      {/* Les congés n'apparaissent qu'une fois les horaires posés : au jour un,
          ils n'ont aucun sens (planche 14c). */}
      {listeHoraires.length > 0 ? (
        <CarteEcran
          principal={
            listeConges.length > 0
              ? `Congés : ${jourCourt.format(new Date(listeConges[0].starts_at))} au ${jourCourt.format(new Date(listeConges[0].ends_at))}`
              : 'Aucun congé posé'
          }
          secondaire={
            listeConges.length > 1 ? `+ ${String(listeConges.length - 1)} autre(s)` : undefined
          }
          chevron
          href="/app/parametrage/conges"
        />
      ) : null}

      <EtiquetteSection>Ma Page</EtiquetteSection>
      <CarteEcran
        principal={pro.published ? `wiggy.fr/${pro.slug}` : 'Ma Page'}
        secondaire={
          pro.published
            ? 'En ligne'
            : pret
              ? 'Prête à être mise en ligne'
              : 'S’ouvre après tes 3 premières étapes'
        }
        chevron={pret || pro.published}
        href={pret || pro.published ? '/app/parametrage/profil' : undefined}
      />

      {/*
        La déconnexion vivait dans la barre du haut, supprimée par D12. Sa place
        est ici : le hub est l'écran du compte, et la planche 14c n'en montre
        aucune autre. Discrète, en fin de page, jamais à côté d'une action de
        réglage.
      */}
      <form action={seDeconnecter} className="mt-10 border-t border-trait-discret pt-6">
        <button
          type="submit"
          className="tactile font-semibold text-texte-secondaire hover:text-erreur"
        >
          Se déconnecter
        </button>
      </form>
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

/** La plage commune, ou le nombre de plages différentes s'il y en a plusieurs. */
function plageCommune(horaires: { starts_at: string; ends_at: string }[]): string {
  const plages = [
    ...new Set(horaires.map((h) => `${h.starts_at.slice(0, 5)} à ${h.ends_at.slice(0, 5)}`)),
  ]
  return plages.length === 1 ? plages[0] : `${String(plages.length)} plages différentes`
}
