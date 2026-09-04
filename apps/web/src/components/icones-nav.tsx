/**
 * Les quatre icônes de la navigation, planche 14a.
 *
 * La planche les dessine en boîtes CSS positionnées ; elles sont reprises ici
 * en SVG, **à la géométrie près** : boîte de 18 px, traits de 2 px, et les
 * mêmes centres et rayons une fois la mesure des bordures reportée sur l'axe du
 * trait (`box-sizing: border-box` place la bordure À L'INTÉRIEUR, donc un
 * cercle de 7 px à bordure de 2 a un rayon d'axe de 2,5 et non de 3,5).
 *
 * Toutes prennent `currentColor` : c'est le lien qui décide de la couleur, doux
 * au repos et miel à l'entrée active, et les icônes suivent sans le savoir.
 */

const TRAIT = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-[18px] shrink-0">
      {children}
    </svg>
  )
}

/**
 * Tournée : un point de départ, une route qui serpente, une destination.
 *
 * La planche construit le serpentin avec deux demi-arcs dans une boîte pivotée
 * de 45 degrés. On garde la rotation plutôt que d'aplatir les arcs à la main :
 * c'est elle qui fait pencher la route entre le départ en haut à gauche et
 * l'arrivée en bas à droite.
 */
export function IconeTournee() {
  return (
    <Cadre>
      <circle cx="3" cy="3" r="3" fill="currentColor" />
      <g transform="rotate(45 9 9)">
        <path d="M4.5 7.25a2 1.25 0 0 1 4 0" {...TRAIT} />
        <path d="M9.5 10.25a2 1.25 0 0 0 4 0" {...TRAIT} />
      </g>
      <circle cx="14.5" cy="14.5" r="2.5" {...TRAIT} />
    </Cadre>
  )
}

/** Agenda : un calendrier, ses deux anneaux et le jour en cours. */
export function IconeAgenda() {
  return (
    <Cadre>
      <rect x="3" y="4" width="12" height="11" rx="3" {...TRAIT} />
      <path d="M6 1v3M12 1v3" {...TRAIT} />
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
    </Cadre>
  )
}

/** Clientes : une silhouette, tête et épaules. */
export function IconeClientes() {
  return (
    <Cadre>
      <circle cx="9" cy="4" r="3" {...TRAIT} />
      <path d="M3 18a6 6 0 0 1 12 0" {...TRAIT} />
    </Cadre>
  )
}

/**
 * Profil : deux réglages, chacun avec son curseur.
 *
 * Le rail est à 40 % et le curseur plein : c'est la planche, et c'est ce qui
 * fait lire un réglage plutôt qu'un menu. Les deux curseurs sont de côtés
 * opposés, sans quoi l'icône ressemble à un signe « égal ».
 */
export function IconeProfil() {
  return (
    <Cadre>
      <rect x="0" y="3.5" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="5.5" cy="5" r="3.5" fill="currentColor" />
      <rect x="0" y="11.5" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="12.5" cy="13" r="3.5" fill="currentColor" />
    </Cadre>
  )
}
