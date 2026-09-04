import type { MetadataRoute } from 'next'

/**
 * C9 ① — Wiggy s'installe sur l'écran d'accueil.
 *
 * **Le produit doit RESSEMBLER à une application, pas à un site épinglé.**
 * C'est `display: 'standalone'` qui fait la différence : sans lui, la barre
 * d'adresse reste visible et la pro voit un site web, pas son outil de travail.
 *
 * ⚠️ **Langage de recrutement (D4)** : « Wiggy sur ton téléphone », jamais
 * « une app à installer ». La PWA s'installe et se comporte comme une
 * application, mais elle ne vient pas d'un magasin : le mot exact évite une
 * promesse qu'on ne tient pas. Le `name` respecte cette règle.
 *
 * `start_url` pointe sur la TOURNÉE et non sur l'accueil : quand la pro ouvre
 * son icône, elle est en train de travailler. L'accueil est pour qui découvre.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wiggy',
    short_name: 'Wiggy',
    description: 'Tes journées, bouclées.',
    start_url: '/app/tournee',
    // `standalone` plutôt que `fullscreen` : on garde l'heure et la batterie.
    // Une pro qui coiffe regarde l'heure toutes les cinq minutes.
    display: 'standalone',
    orientation: 'portrait',
    // Prune : la barre d'état du système prend cette couleur, et l'application
    // commence au bord de l'écran plutôt qu'après un bandeau blanc.
    theme_color: '#45173C',
    background_color: '#FBEEE6',
    lang: 'fr',
    categories: ['business', 'productivity'],
    /*
      L'icône vient du livrable Design (`icone-app.png`, 512 px) et non du
      `icon.png` du dépôt, qui ne fait que 128 px : sous 192 px, Android refuse
      purement et simplement de proposer l'installation. Une icône trop petite
      n'est pas un défaut esthétique ici, c'est ① qui ne marche pas.

      `maskable` : Android découpe l'icône à sa propre forme. Sans cette
      déclaration il l'inscrit dans un carré blanc, et l'identité disparaît.
    */
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
