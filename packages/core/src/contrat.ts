/**
 * G7 — l'acceptation contractuelle tracée.
 *
 * Le mécanisme de preuve du contrat d'adhésion. Il vit ici, dans le noyau, et
 * non dans une enveloppe (D3) : les deux surfaces doivent dire exactement la
 * même chose sur ce qui a été accepté, et par qui.
 *
 * **La règle qui commande tout le reste : le produit ne connaît AUCUN texte.**
 * Il connaît des identifiants de documents et des versions. Les textes vivent
 * en base, et les définitifs de l'avocat s'y insèrent au jalon J2 sans qu'une
 * ligne de code bouge.
 */

/** Les quatre points d'acceptation. Aucun autre n'existe. */
export const POINTS_ACCEPTATION = [
  'inscription_pro',
  'reservation_cliente',
  'activation_paiement',
  'activation_parrainage',
] as const

export type PointAcceptation = (typeof POINTS_ACCEPTATION)[number]

/** Les documents que chaque point exige. L'ordre est celui de l'affichage. */
export const DOCUMENTS_DU_POINT: Record<PointAcceptation, readonly string[]> = {
  inscription_pro: ['cgv', 'confidentialite'],
  reservation_cliente: ['cgu', 'sms'],
  // ③ renvoie au parcours d'acceptation de Stripe : c'est LUI qui recueille
  // l'accord, et nous n'enregistrons que le fait qu'il a eu lieu. Aucun
  // document Wiggy n'est présenté, sans quoi nous ferions croire que nous
  // sommes partie au contrat de paiement.
  activation_paiement: [],
  activation_parrainage: ['parrainage'],
}

export type DocumentLegal = {
  slug: string
  version: string
  /** Date d'entrée en vigueur, `AAAA-MM-JJ`. */
  effectiveOn: string
  titre: string
  corps: string
}

export type Acceptation = {
  docSlug: string
  docVersion: string
}

/**
 * La version en vigueur d'un document, parmi toutes celles connues.
 *
 * C'est la plus récente dont la date d'entrée en vigueur est PASSÉE. Une
 * version peut donc être préparée à l'avance — le préavis de trente jours des
 * CGV — sans s'appliquer avant l'heure, et sans tâche planifiée pour la
 * basculer : le simple passage du temps la fait entrer en vigueur.
 *
 * `null` si le document n'existe pas ou n'est pas encore en vigueur. Un appel
 * qui rendrait un texte vide serait pire : on ferait accepter du néant.
 */
export function versionEnVigueur(
  documents: readonly DocumentLegal[],
  slug: string,
  aujourdHui: string,
): DocumentLegal | null {
  const applicables = documents
    .filter((d) => d.slug === slug && d.effectiveOn <= aujourdHui)
    .sort((a, b) => (a.effectiveOn < b.effectiveOn ? 1 : a.effectiveOn > b.effectiveOn ? -1 : 0))
  return applicables[0] ?? null
}

/**
 * Ce qu'il reste à faire accepter à ce point, compte tenu de ce qui l'a déjà
 * été.
 *
 * **Une acceptation vaut pour UNE version.** Quand une nouvelle version entre
 * en vigueur, l'accord passé reste vrai pour le texte qu'il visait — il n'est
 * ni effacé ni transféré — et le document revient dans cette liste. C'est
 * exactement ce que « une nouvelle version ne réécrit pas les acceptations
 * passées et redemande l'accord » veut dire, et c'est la seule lecture qui
 * laisse la preuve intacte.
 *
 * Un document introuvable est rendu manquant plutôt qu'ignoré : mieux vaut un
 * écran qui ne peut pas se valider qu'un compte créé sans les CGV.
 */
export function documentsARedemander(
  point: PointAcceptation,
  documents: readonly DocumentLegal[],
  dejaAcceptes: readonly Acceptation[],
  aujourdHui: string,
): { slug: string; document: DocumentLegal | null }[] {
  return DOCUMENTS_DU_POINT[point]
    .map((slug) => {
      const document = versionEnVigueur(documents, slug, aujourdHui)
      const accepte =
        document !== null &&
        dejaAcceptes.some((a) => a.docSlug === slug && a.docVersion === document.version)
      return accepte ? null : { slug, document }
    })
    .filter((v): v is { slug: string; document: DocumentLegal | null } => v !== null)
}

/**
 * Le point est-il franchissable ?
 *
 * Il l'est quand plus rien n'est à redemander. Un document manquant en base
 * rend `false`, et c'est voulu : voir plus haut.
 */
export function acceptationComplete(
  point: PointAcceptation,
  documents: readonly DocumentLegal[],
  dejaAcceptes: readonly Acceptation[],
  aujourdHui: string,
): boolean {
  return documentsARedemander(point, documents, dejaAcceptes, aujourdHui).length === 0
}

/**
 * La case n'est JAMAIS pré-cochée. Cette constante existe pour que la règle
 * soit citable depuis un test, et pas seulement respectée par habitude.
 *
 * Une case pré-cochée n'est pas un consentement : c'est un défaut d'attention
 * transformé en accord, et le droit européen le dit avant nous.
 */
export const CASE_PRECOCHEE = false
