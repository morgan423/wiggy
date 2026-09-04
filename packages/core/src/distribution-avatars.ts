import { rangeeValide } from './avatar.ts'

/**
 * Qui joue quoi sur la home (planche 19a).
 *
 * ⚠️ **C'EST LA SEULE CHOSE QUE LA PLANCHE NE DIT PAS, ET C'EST DONC UN CHOIX
 * QUE J'AI FAIT.** Elle référence ses images par identifiant opaque et laisse
 * `alt=""` sur quatre des huit ; les quatre autres portent « Sophie »,
 * « Sandrine », « Awa », « Paul », dont un seul — Awa — existe dans le système
 * à huit personnages. La correspondance est donc indéterminée, et Design a le
 * dernier mot : ce fichier est une proposition, signalée à Morgan.
 *
 * Ce qui n'est PAS arbitraire, en revanche :
 *
 * · **Awa est nommée par la planche**, elle garde son illustration ;
 * · **les huit servent exactement une fois** — la page montre toute la troupe,
 *   ce qui est le propos d'un système à huit personnages et évite le hasard qui
 *   ferait revenir deux fois le même visage à trois blocs d'écart ;
 * · **les rangées respectent la règle du manifeste** : jamais deux pastilles de
 *   même couleur côte à côte. Ce n'est pas une intention, c'est vérifié plus
 *   bas et un test le tient.
 *
 * Elle vit dans `core` et non au pied de la home : c'est de la donnée pure, sans
 * React ni Next, et `archi:check` a eu raison de la refuser dans l'enveloppe.
 * L'effet secondaire est heureux — la vérification ci-dessous tourne désormais
 * dans la suite de tests du paquet, pas seulement au chargement d'une page.
 *
 * Regrouper la distribution ici plutôt que de semer des identifiants dans cinq
 * composants a une raison précise : le jour où Design tranche, il y a **un**
 * fichier à corriger, et la règle de composition reste vérifiable d'un coup
 * d'œil — dispersée, elle serait invérifiable.
 */

/** L'avatar de la pro de démonstration, au coin de la carte du héros. */
export const AVATAR_HEROS = 'elsa'

/**
 * La bande « Fait pour tous les cheveux ».
 *
 * Théo porte des locks mi-longues : sur une phrase qui dit « tous les cheveux,
 * et celles ET CEUX qui les coiffent », une texture marquée et un personnage
 * masculin disent les deux moitiés de la phrase à la fois. Un carré lisse
 * n'aurait illustré ni l'une ni l'autre.
 */
export const AVATAR_INCLUSIVITE = 'theo'

/** Les trois témoignages de la planche, dans leur ordre d'affichage. */
export const AVATARS_AVIS: Record<string, string> = {
  Sandrine: 'jeanne',
  Awa: 'awa',
  Paul: 'marc',
}

/** Le trio empilé du programme Ambassadrices. */
export const AVATARS_AMBASSADRICES = ['lou', 'karim', 'nadia']

/**
 * ⚠️ LA RÈGLE DE COMPOSITION SE VÉRIFIE AU CHARGEMENT DU MODULE.
 *
 * Le manifeste demande de ne jamais poser deux pastilles de même couleur côte à
 * côte en rangée. Écrite en commentaire, cette règle se serait perdue à la
 * première retouche : quelqu'un — moi — change un identifiant pour une bonne
 * raison, et casse une contrainte qu'il ne relit pas.
 *
 * On lève donc ici, au chargement. Les deux rangées sont figées dans le code :
 * l'erreur ne peut pas dépendre d'une donnée, elle est structurelle, et une
 * page qui refuse de se construire vaut mieux qu'une composition fautive mise
 * en ligne. Un test le couvre aussi, pour que l'échec ait un nom.
 */
for (const rangee of [Object.values(AVATARS_AVIS), AVATARS_AMBASSADRICES]) {
  if (!rangeeValide(rangee)) {
    throw new Error(
      `Composition d'avatars fautive : ${rangee.join(', ')} pose deux pastilles ` +
        'de même couleur côte à côte (règle du manifeste).',
    )
  }
}
