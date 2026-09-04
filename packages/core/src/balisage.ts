/**
 * A2 — le balisage structuré d'une fiche pro.
 *
 * ⚠️ **CONTRAINTE DE SÉCURITÉ, NON NÉGOCIABLE : l'adresse du domicile de la pro
 * et ses coordonnées précises ne sont JAMAIS exposées publiquement, balisage
 * structuré compris.**
 *
 * C'est le piège exact de ce chantier. Un `LocalBusiness` demande naturellement
 * une `address` et un `geo` : les moteurs les réclament, les guides de
 * référencement les recommandent, et une pro à domicile n'a d'autre adresse que
 * la sienne. **On ne les donne pas.** Ce module ne reçoit même pas ces valeurs
 * en paramètre : elles ne peuvent pas fuir par distraction, puisqu'elles
 * n'entrent jamais.
 *
 * Ce qui porte le référencement local à leur place, et le porte mieux : la
 * **zone d'intervention**, une liste de communes en `areaServed`. C'est la
 * modélisation juste pour une activité qui se déplace — le lieu du service est
 * chez la cliente, pas chez la pro — et c'est aussi celle que les moteurs
 * comprennent pour ce cas.
 */

export type FichePourBalisage = {
  nom: string
  slug: string
  accroche?: string | null
  /** Les communes desservies. C'est ELLE qui porte le référencement local. */
  communes: readonly string[]
  prestations: readonly { nom: string; prixCentimes: number; dureeMin: number }[]
  /** L'URL publique complète, seule donnée de localisation autorisée. */
  url: string
}

/**
 * Les clés interdites, listées pour que le test puisse les citer.
 *
 * Une liste explicite vaut mieux qu'une intention : le jour où quelqu'un
 * ajoutera `address` en croyant bien faire, c'est le test qui le dira.
 */
export const CLES_INTERDITES = [
  'address',
  'streetAddress',
  'postalCode',
  'geo',
  'latitude',
  'longitude',
  'hasMap',
  'telephone',
] as const

export function balisageFiche(fiche: FichePourBalisage): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${fiche.url}#pro`,
        name: fiche.nom,
        url: fiche.url,
        ...(fiche.accroche ? { description: fiche.accroche } : {}),
        // Le métier, pour que le moteur sache de quoi il s'agit.
        additionalType: 'https://schema.org/HairSalon',
        // ⚠️ NI `address`, NI `geo`, NI `telephone`. La zone dit où le service
        // est rendu, ce qui est la vérité : chez la cliente.
        areaServed: fiche.communes.map((nom) => ({
          '@type': 'City',
          name: nom,
          addressCountry: 'FR',
        })),
        makesOffer: fiche.prestations.map((p) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: p.nom,
            serviceType: 'Coiffure à domicile',
            // Le service est rendu chez la cliente : c'est ce que dit
            // `serviceArea`, et c'est pour cela qu'aucune adresse n'est utile.
            areaServed: fiche.communes.map((nom) => ({ '@type': 'City', name: nom })),
          },
          price: (p.prixCentimes / 100).toFixed(2),
          priceCurrency: 'EUR',
        })),
      },
    ],
  }
}
