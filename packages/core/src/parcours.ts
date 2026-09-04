/**
 * G3 — le parcours d'activation.
 *
 * **Les écrans existaient déjà ; c'est le CHEMIN qui manquait.** Une pro qui
 * s'inscrit arrivait sur un hub et devait deviner par où commencer, dans quel
 * ordre, et quand elle avait fini. Chaque écran était bon, la suite n'existait
 * pas.
 *
 * **L'objectif est chiffré et il est VISIBLE** : première réservation reçue
 * sous 48 heures. C'est la métrique de conversion de l'essai, et l'afficher
 * n'est pas un ornement — c'est ce qui transforme cinq réglages en une course
 * qui a un but.
 */

export type EtapeParcours = {
  cle: string
  titre: string
  /** Pourquoi cette étape existe, en une phrase qui parle du RÉSULTAT. */
  pourquoi: string
  href: string
  /** Sans elle, la page ne peut pas prendre de réservation. */
  bloquante: boolean
}

/**
 * Les cinq étapes, dans l'ordre.
 *
 * L'ordre n'est pas arbitraire : on ne peut pas fixer une zone avant de savoir
 * ce qu'on propose, ni des horaires avant de savoir où l'on va. La photo et le
 * partage viennent après parce qu'ils ne conditionnent rien — mais ils sont ce
 * qui déclenche la première réservation, donc ils ne sont pas facultatifs pour
 * autant.
 */
export const ETAPES: readonly EtapeParcours[] = [
  {
    cle: 'prestations',
    titre: 'Tes prestations',
    pourquoi: 'Ce que tes clientes pourront réserver, et à quel prix.',
    href: '/app/parametrage/prestations',
    bloquante: true,
  },
  {
    cle: 'zone',
    titre: 'Ta zone',
    pourquoi: 'Les communes où tu te déplaces. Deux ou trois suffisent pour commencer.',
    href: '/app/parametrage/zone',
    bloquante: true,
  },
  {
    cle: 'horaires',
    titre: 'Tes journées',
    pourquoi: 'Tes jours et tes heures : c’est ce qui remplit ton agenda de créneaux.',
    href: '/app/parametrage/horaires',
    bloquante: true,
  },
  {
    cle: 'photo',
    titre: 'Ta photo',
    pourquoi: 'Une page avec un visage se choisit plus souvent qu’une page sans.',
    href: '/app/parametrage/profil',
    bloquante: false,
  },
  {
    cle: 'partage',
    titre: 'Ton lien',
    pourquoi: 'À poser dans ta bio Instagram : c’est lui qui apporte la première réservation.',
    href: '/app/parametrage/profil',
    bloquante: false,
  },
]

export type EtatEtapes = Record<string, boolean>

/** La prochaine chose à faire, ou `null` quand tout est fait. */
export function prochaineEtape(faites: EtatEtapes): EtapeParcours | null {
  return ETAPES.find((e) => !faites[e.cle]) ?? null
}

/** Combien d'étapes restent. Sert au sous-titre du hub. */
export function etapesRestantes(faites: EtatEtapes): number {
  return ETAPES.filter((e) => !faites[e.cle]).length
}

/**
 * La page peut-elle prendre une réservation ?
 *
 * Seules les étapes bloquantes comptent : une pro sans photo prend des
 * réservations, une pro sans horaires n'a aucun créneau à offrir.
 */
export function peutRecevoir(faites: EtatEtapes): boolean {
  return ETAPES.filter((e) => e.bloquante).every((e) => faites[e.cle])
}

export const OBJECTIF_HEURES = 48

/**
 * Le compte à rebours de l'objectif, en heures pleines restantes.
 *
 * `null` une fois le délai passé : **on n'affiche jamais un compteur négatif ni
 * un échec.** Une pro qui n'a pas reçu de réservation en 48 heures n'a pas
 * besoin qu'on le lui reproche ; l'objectif sert à donner un cap au démarrage,
 * pas à noter la personne. Passé le délai, l'écran parle d'autre chose.
 */
export function heuresRestantes(inscriteLe: Date, maintenant = new Date()): number | null {
  const ecoulees = (maintenant.getTime() - inscriteLe.getTime()) / 3_600_000
  const reste = OBJECTIF_HEURES - ecoulees
  return reste > 0 ? Math.ceil(reste) : null
}

/** « 47 h », « 2 h ». Au singulier comme au pluriel, l'unité ne change pas. */
export function libelleRestant(heures: number): string {
  return `${String(heures)} h`
}
