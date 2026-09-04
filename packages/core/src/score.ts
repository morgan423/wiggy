import { distanceVolDOiseauKm, type Minutes, type Point } from './trajets.ts'

/**
 * A12 — le score de cohérence des créneaux.
 *
 * **L'écart que ce module comble.** Le moteur de créneaux est un filtre de
 * FAISABILITÉ : il ne propose que des créneaux où les trajets réels tiennent.
 * C'est juste, et ça ne change pas. Mais tous les créneaux faisables étaient
 * proposés À ÉGALITÉ : une journée avec du mou pouvait proposer un aller-retour
 * de 45 minutes en plein milieu, faisable au sens strict, absurde au sens du
 * métier. **La promesse dit « des créneaux cohérents avec la tournée », le
 * moteur disait « des créneaux compatibles avec l'agenda ».**
 *
 * ⚠️ **LA RÈGLE D'OR, non négociable : on n'interdit ni ne cache JAMAIS un
 * créneau faisable.** Ce module ne rend aucun booléen, ne filtre rien, et ne
 * peut structurellement pas retirer un créneau : il rend un NOMBRE, et l'appelant
 * s'en sert pour ORDONNER. Une cliente qui n'est libre que mardi à midi doit
 * pouvoir réserver mardi à midi, sans friction et sans avertissement
 * culpabilisant.
 *
 * ⚠️ **LE PRINCIPE FONDATEUR reste intact : on ne réordonnance JAMAIS un
 * rendez-vous existant.** Rien ici ne lit un rendez-vous pour le déplacer : les
 * rendez-vous posés sont des DONNÉES D'ENTRÉE, et le seul objet façonné est la
 * demande ENTRANTE. « L'app propose, le pro dispose. »
 */

/* ─────────────────────────────────────────────────────────────────────────
   LES PONDÉRATIONS.

   Elles se calibrent PENDANT la bêta, avec la télémétrie de E3 (événement ①,
   l'étage et le rang du créneau choisi). Elles sont donc toutes ici, nommées,
   documentées d'une ligne, et modifiables sans toucher à la logique : aucun
   nombre magique ne vit ailleurs dans ce fichier.
   ───────────────────────────────────────────────────────────────────────── */
export const POIDS = {
  /** Point retiré par minute de trajet AJOUTÉE à la journée. Le cœur du score. */
  PAR_MINUTE_AJOUTEE: 1,
  /** Le créneau se pose à côté d'un rendez-vous du même secteur : la pro y est déjà. */
  BONUS_MEME_SECTEUR: 30,
  /** Le créneau BOUCHE un trou entre deux rendez-vous au lieu d'allonger la journée. */
  BONUS_DENSIFICATION: 20,
  /** Aller-retour isolé en milieu de journée : faisable, mais absurde à conduire. */
  PENALITE_SAUT_ISOLE: 40,
  /** Au-delà de ce coût marginal, l'insertion cesse d'être un détour et devient un voyage. */
  SEUIL_SAUT_ISOLE_MIN: 30,
  /** Rayon du « même quartier », en kilomètres. Au-delà, ce n'est plus le coin de la rue. */
  RAYON_QUARTIER_KM: 2,
  /** Score en deçà duquel un créneau quitte le premier étage. */
  SEUIL_RECOMMANDE: 0,
  /** Plafond du premier étage : au-delà, ce n'est plus une recommandation, c'est une liste. */
  MAX_PREMIER_ETAGE: 6,
} as const

/**
 * Ce qu'il faut savoir d'un créneau pour le noter.
 *
 * Les trois durées de trajet sont **déjà connues de l'appelant** : deux
 * viennent du contrôle de faisabilité qui les calculait puis les jetait, la
 * troisième est le trajet que la pro ferait DE TOUTE FAÇON sans ce rendez-vous.
 */
export type EntreeScore = {
  /** Trajet du lieu précédent vers la cliente. `undefined` si rien avant. */
  trajetAvant?: Minutes
  /** Trajet de la cliente vers le lieu suivant. `undefined` si rien après. */
  trajetApres?: Minutes
  /**
   * Trajet que la pro ferait du précédent au suivant SANS ce rendez-vous.
   *
   * C'est lui qui transforme une durée en COÛT : sans ce terme, un créneau
   * inséré entre deux adresses éloignées serait puni de tout le trajet, alors
   * que la pro allait le faire de toute manière.
   */
  trajetDirect?: Minutes
  /** Le lieu de la cliente. Absent en mode fixe (D10 ①) : il n'y a pas de trajet. */
  lieuCliente?: Point | null
  /** Le lieu d'où l'on vient, rendez-vous précédent ou point de départ (D16). */
  lieuAvant?: Point | null
  /** Le lieu où l'on va, rendez-vous suivant ou point de retour (D16). */
  lieuApres?: Point | null
  /**
   * Le créneau est-il ENTRE deux rendez-vous existants ?
   *
   * C'est ce qui distingue boucher un trou d'allonger la journée, et les deux
   * ne se valent pas : le premier remplit du temps déjà payé en trajet.
   */
  entreDeuxRendezVous: boolean
}

export type Note = {
  /** Minutes de conduite AJOUTÉES à la journée par ce rendez-vous. */
  coutMarginalMin: Minutes
  /** Plus il est haut, plus le créneau est cohérent avec la tournée. */
  score: number
}

/**
 * Le coût marginal : les minutes que ce rendez-vous AJOUTE réellement.
 *
 *     avant + après − direct
 *
 * Un créneau qui s'insère sur un trajet que la pro faisait déjà coûte presque
 * rien ; un créneau qui impose un détour coûte le détour. Le résultat est borné
 * à zéro : une insertion ne peut pas faire GAGNER du temps de route, et un
 * nombre négatif ne viendrait que d'une incohérence entre une durée réelle et
 * une durée estimée.
 */
export function coutMarginal(
  entree: Pick<EntreeScore, 'trajetAvant' | 'trajetApres' | 'trajetDirect'>,
): Minutes {
  const avant = entree.trajetAvant ?? 0
  const apres = entree.trajetApres ?? 0
  const direct = entree.trajetDirect ?? 0
  return Math.max(0, avant + apres - direct)
}

/**
 * La note d'un créneau. **Aucun filtre, jamais** : un nombre, et rien d'autre.
 *
 * En mode fixe (D10 ①) il n'y a pas de trajet, donc pas de cohérence de tournée
 * à mesurer : tous les créneaux se valent, et le score est nul pour tous. C'est
 * le calcul juste pour ce mode d'exercice, pas un cas dégradé.
 */
export function noterCreneau(entree: EntreeScore): Note {
  const cout = coutMarginal(entree)
  if (!entree.lieuCliente) return { coutMarginalMin: 0, score: 0 }

  let score = -cout * POIDS.PAR_MINUTE_AJOUTEE

  // ① La proximité : la pro est DÉJÀ dans le quartier, avant ou après.
  if (
    proche(entree.lieuCliente, entree.lieuAvant) ||
    proche(entree.lieuCliente, entree.lieuApres)
  ) {
    score += POIDS.BONUS_MEME_SECTEUR
  }

  // ② La densification : boucher un trou plutôt qu'allonger la journée.
  if (entree.entreDeuxRendezVous) score += POIDS.BONUS_DENSIFICATION

  // ③ Le saut isolé en milieu de journée : la pro part loin, revient, et rien
  // d'autre ne justifie le voyage. C'est le cas exact que A12 vient corriger.
  if (
    entree.entreDeuxRendezVous &&
    cout >= POIDS.SEUIL_SAUT_ISOLE_MIN &&
    !proche(entree.lieuCliente, entree.lieuAvant) &&
    !proche(entree.lieuCliente, entree.lieuApres)
  ) {
    score -= POIDS.PENALITE_SAUT_ISOLE
  }

  return { coutMarginalMin: cout, score }
}

/**
 * Les deux étages de la planche 15b, écran 3.
 *
 * ⚠️ **Aucun créneau ne disparaît.** Le second étage contient tout le reste, en
 * ordre chronologique : la répartition change la MISE EN AVANT, jamais le
 * périmètre de ce qui est réservable.
 *
 * **Le premier étage peut être VIDE**, et c'est un cas normal, pas un échec :
 * une journée où aucun créneau ne se distingue ne doit pas afficher
 * « Sophie est près de chez vous » sur un créneau qui ne l'est pas. L'appelant
 * ouvre alors la liste complète directement.
 */
export function repartirEnEtages<T extends { debut: Date; score: number }>(
  creneaux: readonly T[],
): { recommandes: T[]; autres: T[] } {
  const parScore = [...creneaux].sort(
    (a, b) => b.score - a.score || a.debut.getTime() - b.debut.getTime(),
  )
  const recommandes = parScore
    .filter((c) => c.score >= POIDS.SEUIL_RECOMMANDE)
    .slice(0, POIDS.MAX_PREMIER_ETAGE)

  // Un seul créneau recommandé ne fait pas une recommandation : il ne laisse
  // aucun choix, et le titre promettrait plus que la liste ne tient.
  if (recommandes.length < 2) return { recommandes: [], autres: chronologique(creneaux) }

  const retenus = new Set(recommandes.map((c) => c.debut.getTime()))
  return {
    recommandes: chronologique(recommandes),
    autres: chronologique(creneaux.filter((c) => !retenus.has(c.debut.getTime()))),
  }
}

function chronologique<T extends { debut: Date }>(creneaux: readonly T[]): T[] {
  return [...creneaux].sort((a, b) => a.debut.getTime() - b.debut.getTime())
}

/** Même quartier, au sens du rayon ci-dessus. Sans lieu, on ne suppose rien. */
function proche(cliente: Point, autre: Point | null | undefined): boolean {
  if (!autre) return false
  return distanceVolDOiseauKm(cliente, autre) <= POIDS.RAYON_QUARTIER_KM
}
