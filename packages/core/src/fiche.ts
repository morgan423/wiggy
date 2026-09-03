/**
 * B1 — ce qu'une fiche cliente sait dire d'elle-même.
 *
 * Tout ici est du calcul sur l'historique, sans aucune écriture : la fiche ne
 * stocke pas « revient toutes les 5 semaines », elle le déduit. Un chiffre
 * stocké mentirait dès le rendez-vous suivant.
 *
 * D3 : ce module vit dans le cœur commun parce que les deux enveloppes
 * afficheront la même fiche, et qu'elles doivent en dire exactement la même
 * chose. Un rythme calculé deux fois est un rythme calculé de deux façons.
 */

/** Un rendez-vous, réduit à ce qui sert au résumé d'une fiche. */
export type VisiteHistorique = {
  debut: Date
  /** Une visite annulée n'a pas eu lieu : elle ne compte dans aucun calcul. */
  annulee?: boolean
}

/**
 * Le rythme de retour, en semaines. `null` tant qu'il n'a pas de sens.
 *
 * La planche 16c l'affiche **à partir de 3 rendez-vous** : avec deux visites on
 * n'a qu'un intervalle, et un intervalle n'est pas un rythme. C'est ce chiffre
 * qui armera la relance (11c) : le poser trop tôt ferait relancer des clientes
 * sur une régularité qu'on aurait inventée.
 *
 * La MÉDIANE et non la moyenne : une visite exceptionnelle à six mois d'écart
 * ne doit pas transformer une habituée des cinq semaines en cliente semestrielle.
 */
export function rythmeDeRetourSemaines(visites: VisiteHistorique[]): number | null {
  const passees = visites
    .filter((v) => !v.annulee)
    .map((v) => v.debut.getTime())
    .sort((a, b) => a - b)
  if (passees.length < 3) return null

  const ecarts: number[] = []
  for (let i = 1; i < passees.length; i++) {
    ecarts.push((passees[i] - passees[i - 1]) / (7 * 24 * 3600 * 1000))
  }
  ecarts.sort((a, b) => a - b)
  const milieu = Math.floor(ecarts.length / 2)
  const mediane =
    ecarts.length % 2 === 1 ? ecarts[milieu] : (ecarts[milieu - 1] + ecarts[milieu]) / 2
  const semaines = Math.round(mediane)
  // Un rythme d'une semaine ou moins n'en est pas un : c'est une série de
  // rendez-vous rapprochés, une mèche à reprendre, un mariage qui se prépare.
  return semaines >= 2 ? semaines : null
}

/** Le nombre de visites qui ont réellement eu lieu. */
export function visitesEffectives(visites: VisiteHistorique[]): number {
  return visites.filter((v) => !v.annulee).length
}

/** La première visite, celle qui date la relation. `null` si elle n'a pas eu lieu. */
export function depuisQuand(visites: VisiteHistorique[]): Date | null {
  const passees = visites.filter((v) => !v.annulee).map((v) => v.debut.getTime())
  return passees.length > 0 ? new Date(Math.min(...passees)) : null
}
