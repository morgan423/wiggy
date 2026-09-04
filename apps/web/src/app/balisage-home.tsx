import { copy } from '@wiggy/copy'

const S = copy.siteAccueil

/**
 * Le balisage structuré de la home.
 *
 * `SoftwareApplication` avec ses trois `Offer`, et `FAQPage` pour la section 10.
 *
 * ⚠️ **NI `Review` NI `AggregateRating`, et c'est le point qui compte.** Les
 * témoignages affichés aujourd'hui sont des faux de composition : les décrire en
 * données structurées reviendrait à déclarer de fausses notes à un moteur de
 * recherche, ce qui est une faute d'un autre ordre que de les montrer. Ce
 * balisage-là s'ajoute avec les avis réels (A7), pas avant.
 *
 * Les prix viennent du copy deck, jamais réécrits ici : deux sources de prix
 * finissent toujours par diverger, et c'est celle que personne ne relit qui part
 * dans les résultats de recherche.
 */
export function BalisageHome() {
  const prix = (offre: { prix: string }) => offre.prix.replace('€', '').replace(',', '.').trim()

  const donnees = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Wiggy',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: S.hero.sousTitre,
        inLanguage: 'fr-FR',
        offers: S.prix.offres.map((o) => ({
          '@type': 'Offer',
          name: o.nom,
          description: o.accroche,
          price: prix(o),
          priceCurrency: 'EUR',
          category: 'subscription',
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: S.faq.questions.map((q) => ({
          '@type': 'Question',
          name: q.q,
          acceptedAnswer: { '@type': 'Answer', text: q.r },
        })),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD n'a pas d'autre forme.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }}
    />
  )
}
