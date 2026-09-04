/**
 * D17 ⑥ — les résumés du hub.
 *
 * **Toute la valeur d'un hub est là.** La planche 14c le dit elle-même :
 * « chaque rangée résume ET ouvre sa section ». Un résumé riche évite d'ouvrir ;
 * un résumé pauvre oblige à ouvrir chaque écran pour savoir où on en est, et le
 * hub redevient un menu, c'est-à-dire un clic de plus avant l'écran voulu.
 *
 * Le critère qui décide, et il se vérifie : **« en deux défilements, elle voit
 * tout sans avoir besoin d'ouvrir. »**
 *
 * Chaque fonction rend **deux lignes** : le principal et son détail, comme les
 * rangées de 14c, dont le résumé de droite est un bloc de deux lignes et non
 * une ligne unique. C'est cette pile qui fait tenir « 4 prestations » ET
 * « de 28 € à 75 € » dans la largeur d'un téléphone.
 *
 * ⚠️ **Aucune de ces fonctions ne parle du jour un.** Un compte neuf n'affiche
 * AUCUN zéro : il invite. Les états vides restent à l'écran qui les rend, et
 * ces fonctions ne sont appelées que sur un compte rempli.
 */

export type Resume = { principal: string; detail?: string }

const ABREGE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const ABREGE_MINUSCULE = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

/** « 45 € » ou « de 45 € à 75 € ». Une seule prestation ne fait pas une fourchette. */
export function fourchetteDePrix(centimes: readonly number[]): string | undefined {
  if (centimes.length === 0) return undefined
  const mini = Math.min(...centimes)
  const maxi = Math.max(...centimes)
  const euros = (c: number) =>
    c % 100 === 0 ? `${String(c / 100)} €` : `${(c / 100).toFixed(2).replace('.', ',')} €`
  return mini === maxi ? euros(mini) : `de ${euros(mini)} à ${euros(maxi)}`
}

/** « 4 prestations » puis « de 45 € à 75 € ». */
export function resumePrestations(prestations: readonly { price_cents: number }[]): Resume {
  return {
    principal: `${String(prestations.length)} prestation${prestations.length > 1 ? 's' : ''}`,
    detail: fourchetteDePrix(prestations.map((p) => p.price_cents)),
  }
}

/**
 * « Nantes, Rezé, Vertou » puis « hors zone : base 10 € ».
 *
 * **Jamais d'ellipsis sur un nom de commune** : la planche 14c est explicite, et
 * une commune coupée en deux ne se reconnaît plus. Au-delà de trois, on compte
 * le reste plutôt que de tronquer.
 */
export function resumeZone(
  communes: readonly { name: string }[],
  forfaitCentimes?: number | null,
): Resume {
  const noms = communes.map((c) => c.name)
  const principal =
    noms.length <= 3
      ? noms.join(', ')
      : `${noms.slice(0, 2).join(', ')} + ${String(noms.length - 2)} communes`
  return {
    principal,
    detail:
      forfaitCentimes === null || forfaitCentimes === undefined
        ? undefined
        : `hors zone : base ${fourchetteDePrix([forfaitCentimes]) ?? ''}`,
  }
}

/**
 * « Lun à Sam · 9h à 18h » puis « mer. off » ou « congés du 4 au 18 août ».
 *
 * **Le trou dans la semaine est nommé**, pas gommé. Une pro qui ne travaille
 * pas le mercredi doit le voir sans ouvrir : c'est exactement le genre
 * d'information qu'on vient vérifier, et un « Lun à Sam » seul serait faux.
 *
 * Le congé prime sur le jour de repos quand les deux existent : un jour off est
 * une habitude, un congé est une exception datée, et c'est l'exception qu'on
 * vient vérifier.
 */
export function resumeJournees(
  horaires: readonly { weekday: number; starts_at: string; ends_at: string }[],
  conges: readonly { starts_at: string; ends_at: string }[] = [],
  aujourdHui = new Date(),
): Resume {
  if (horaires.length === 0) return { principal: 'Aucun jour' }

  const jours = [...new Set(horaires.map((h) => h.weekday))].sort((a, b) => a - b)
  const premier = jours[0]
  const dernier = jours[jours.length - 1]
  const creux = []
  for (let j = premier; j <= dernier; j += 1) if (!jours.includes(j)) creux.push(j)

  const plage =
    jours.length === 1
      ? ABREGE[premier]
      : creux.length === 0 && jours.length > 2
        ? `${ABREGE[premier]} à ${ABREGE[dernier]}`
        : creux.length > 0
          ? `${ABREGE[premier]} à ${ABREGE[dernier]}`
          : jours.map((j) => ABREGE[j]).join(', ')

  const heures = `${heure(min(horaires.map((h) => h.starts_at)))} à ${heure(max(horaires.map((h) => h.ends_at)))}`

  // Le congé à venir ou en cours, le plus proche. Un congé passé n'apprend
  // rien : il ne se vérifie pas, il s'oublie.
  const jour = aujourdHui.toISOString().slice(0, 10)
  const prochain = [...conges]
    .filter((c) => c.ends_at.slice(0, 10) >= jour)
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    .at(0)

  return {
    principal: `${plage} · ${heures}`,
    detail: prochain
      ? `congés ${periodeEnFrancais(prochain.starts_at, prochain.ends_at)}`
      : creux.length > 0
        ? `${creux.map((j) => ABREGE_MINUSCULE[j]).join(', ')} off`
        : undefined,
  }
}

/** « du 4 au 18 août », « du 28 juillet au 4 août ». */
export function periodeEnFrancais(debutIso: string, finIso: string): string {
  const debut = new Date(debutIso)
  const fin = new Date(finIso)
  const mois = (d: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(d)
  const jour = (d: Date) => String(d.getUTCDate())
  return mois(debut) === mois(fin) && debut.getUTCFullYear() === fin.getUTCFullYear()
    ? `du ${jour(debut)} au ${jour(fin)} ${mois(fin)}`
    : `du ${jour(debut)} ${mois(debut)} au ${jour(fin)} ${mois(fin)}`
}

/** « 9h » ou « 9h30 » : on n'écrit pas les minutes quand il n'y en a pas. */
function heure(hhmmss: string): string {
  const [h, m] = hhmmss.split(':')
  return m === '00' ? `${String(Number(h))}h` : `${String(Number(h))}h${m}`
}

const min = (v: readonly string[]) => v.reduce((a, b) => (a < b ? a : b))
const max = (v: readonly string[]) => v.reduce((a, b) => (a > b ? a : b))
