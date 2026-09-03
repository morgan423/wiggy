/**
 * C2 à C7 — le copilote de tournée.
 *
 * Ce module ne connaît ni écran ni base : il calcule ce qu'il faut dire et
 * quand, à partir d'un trajet et d'une heure. D3 : les deux enveloppes diront
 * la même chose au même moment, ou elles diront deux choses différentes de la
 * même journée, ce qui serait pire que de ne rien dire.
 */

import type { Point } from './trajets.ts'

/* ── C3 : le lien GPS ────────────────────────────────────────────────────── */

/**
 * Les applications de navigation proposées, et **rien d'autre**.
 *
 * Règle de la ligne, non négociable : **aucune navigation embarquée, jamais**.
 * Wiggy ouvre l'application que la pro utilise déjà, avec la destination
 * dedans. Réécrire un GPS serait construire un produit qu'on ne saurait pas
 * tenir, et l'ouvrir en un tap est exactement ce qu'on lui promet.
 */
export const APPS_GPS = ['system', 'waze', 'google_maps'] as const
export type AppGps = (typeof APPS_GPS)[number]

export function estAppGps(valeur: string): valeur is AppGps {
  return (APPS_GPS as readonly string[]).includes(valeur)
}

/**
 * Le lien qui ouvre la destination dans l'application choisie.
 *
 * On passe les coordonnées et non l'adresse : une adresse se réinterprète, un
 * point ne se discute pas. C'est le géocodage de Wiggy qui fait foi, pas celui
 * du GPS, et le piège « rue des Lilas à Pau qui répond dans les Landes » a déjà
 * été payé une fois.
 *
 * L'étiquette accompagne le point quand l'application sait l'afficher : la pro
 * doit reconnaître où elle va avant de démarrer.
 */
export function lienGps(app: AppGps, point: Point, etiquette?: string): string {
  const coord = `${String(point.lat)},${String(point.lng)}`
  const nom = etiquette ? encodeURIComponent(etiquette) : ''
  switch (app) {
    case 'waze':
      return `https://waze.com/ul?ll=${coord}&navigate=yes`
    case 'google_maps':
      return `https://www.google.com/maps/dir/?api=1&destination=${coord}`
    case 'system':
      // Le choix par défaut : Plans sur iOS, la page web ailleurs. `q` porte
      // l'étiquette, `ll` impose le point ; sans `ll`, Plans chercherait
      // l'étiquette et pourrait tomber ailleurs.
      return `https://maps.apple.com/?ll=${coord}${nom ? `&q=${nom}` : ''}`
  }
}

/* ── C4 : le rappel de départ ────────────────────────────────────────────── */

/**
 * Dans combien de minutes partir pour arriver à l'heure.
 *
 * **Jamais un compte à rebours brut déconnecté du trajet** : c'est la règle de
 * C4. « Il reste 25 minutes avant le rendez-vous » n'aide personne quand la
 * route en prend 30. Ce que la pro veut savoir, c'est quand LEVER LE CAMP.
 *
 * Négatif quand il est déjà trop tard : l'appelant en tire un message
 * différent, il ne l'arrondit pas à zéro. Une pro en retard doit le savoir.
 */
export function minutesAvantDepart({
  debutRdv,
  minutesTrajet,
  maintenant,
}: {
  debutRdv: Date
  minutesTrajet: number
  maintenant: Date
}): number {
  const depart = debutRdv.getTime() - minutesTrajet * 60_000
  return Math.round((depart - maintenant.getTime()) / 60_000)
}

/**
 * Le moment où le rappel de départ a un sens.
 *
 * Trop tôt, il devient du bruit qu'on apprend à ignorer ; trop tard, il ne sert
 * plus à rien. La fenêtre s'ouvre un quart d'heure avant le départ et se ferme
 * quand le rendez-vous a commencé.
 */
const FENETRE_RAPPEL_MIN = 15

export function rappelDeDepartPertinent(minutesAvant: number, minutesTrajet: number): boolean {
  return minutesAvant <= FENETRE_RAPPEL_MIN && minutesAvant > -minutesTrajet
}

/* ── C5 : « je suis en retard » ──────────────────────────────────────────── */

/**
 * L'heure d'arrivée estimée, tirée du trajet EN COURS et non d'une devinette.
 *
 * C'est ce qui distingue C5 d'un SMS tapé au volant : la pro ne calcule rien,
 * elle ne s'engage pas au hasard, et la cliente reçoit une heure qui tient.
 */
export function heureDArriveeEstimee(maintenant: Date, minutesTrajet: number): Date {
  return new Date(maintenant.getTime() + minutesTrajet * 60_000)
}

/**
 * Le retard annoncé, arrondi au quart d'heure supérieur.
 *
 * Arrondi vers le haut, toujours : annoncer dix minutes et en mettre vingt fait
 * plus de dégâts qu'annoncer un quart d'heure et arriver en avance.
 */
export function retardArrondiMin(debutRdv: Date, arrivee: Date): number {
  const minutes = Math.round((arrivee.getTime() - debutRdv.getTime()) / 60_000)
  return minutes <= 0 ? 0 : Math.ceil(minutes / 15) * 15
}

/* ── C7 : la reprise du prochain rendez-vous ─────────────────────────────── */

/**
 * La fenêtre où proposer le prochain rendez-vous, d'après le rythme de la
 * cliente.
 *
 * `rythmeSemaines` vient de `fiche.ts` et **ne se prononce pas avant trois
 * visites**. Quand il ne dit rien, cette fonction renvoie `null` : on propose
 * alors sans fenêtre, plutôt que d'inventer une régularité. Proposer « dans
 * cinq semaines » à quelqu'un qu'on a vu deux fois, c'est deviner à voix haute.
 *
 * La fenêtre s'ouvre une semaine avant le rythme et se ferme une semaine après :
 * assez large pour trouver un créneau, assez serrée pour rester juste.
 */
export function fenetreDeReprise({
  rythmeSemaines,
  depuis,
}: {
  rythmeSemaines: number | null
  depuis: Date
}): { debut: Date; fin: Date } | null {
  if (rythmeSemaines === null) return null
  const semaine = 7 * 86_400_000
  return {
    debut: new Date(depuis.getTime() + (rythmeSemaines - 1) * semaine),
    fin: new Date(depuis.getTime() + (rythmeSemaines + 1) * semaine),
  }
}
