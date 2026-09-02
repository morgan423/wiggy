import Link from 'next/link'

/**
 * Les pièces de composition du board, phase 2.
 *
 * Ce fichier n'invente rien. La planche 8a pose la règle de ratio, « sur chaque
 * page, plus de surface pleine couleur que de crème », et la composition
 * asymétrique, statement à gauche, tout-centré banni. La planche 11d montre le
 * bloc prune avec son chiffre héros en miel. La planche 10c montre la carte
 * crème et ses lignes d'état sur surface, ses pastilles et ses boutons en
 * pointillés.
 *
 * Les couleurs viennent des jetons, jamais du HTML du board : celui-ci porte
 * encore des résidus hors palette (un brun terracotta pour les étiquettes de
 * section) que la planche 8a demande précisément de purger.
 */

/**
 * Le panneau pleine couleur qui ouvre chaque écran.
 *
 * C'est la structure des planches 10c et 11d, et c'est elle qui rétablit le
 * ratio de la planche 8a. Le contenu ne vient pas À CÔTÉ du bloc prune, il
 * vient DEDANS : sur la planche 11d, la carte crème occupe 344 px des 560 px
 * du panneau. Posé en frère du bloc, le même contenu redonnait une page à
 * 95 % de crème, ce que la recette 4 a rejeté.
 *
 * Le statement est à gauche, le tout-centré est banni. La carte, elle, est
 * centrée dans le panneau comme sur la planche : ce n'est pas la page qui est
 * centrée, c'est une carte dans un cadre.
 */
export function PanneauPlein({
  statement,
  chiffre,
  legende,
  entete,
  children,
}: {
  statement: string
  /** Le chiffre que le réglage produit. Réel, jamais inventé. */
  chiffre?: string
  legende?: string
  /** Ce qui s'ajoute au statement, dans le plein : une adresse, un bouton. */
  entete?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="sur-plein rounded-bloc bg-prune p-6 text-texte-sur-plein sm:p-10">
      {/* Statement à gauche : le board bannit le tout-centré. */}
      <h1 className="titre max-w-xl tracking-tight">{statement}</h1>
      {chiffre ? (
        <p className="mt-5 flex flex-wrap items-baseline gap-x-4">
          <span className="chiffre-heros text-celebration">{chiffre}</span>
          {legende ? (
            <span className="font-semibold text-texte-sur-plein-doux">{legende}</span>
          ) : null}
        </p>
      ) : legende ? (
        <p className="mt-4 max-w-xl text-texte-sur-plein-doux">{legende}</p>
      ) : null}
      {entete ? <div className="mt-5">{entete}</div> : null}
      {children}
    </section>
  )
}

/**
 * L'en-tête d'écran de la spécification, planches 14c à 14g.
 *
 * Un BANDEAU prune, pas un conteneur : le lien de retour en petit, le statement
 * en Fraunces juste dessous, à gauche, jamais centré. Le corps de l'écran vit
 * ensuite sur la crème, avec ses cartes sur la surface.
 *
 * Le ratio de la planche 8a est tenu ici par le duo bandeau prune en tête et
 * barre de navigation prune en bas (14a) : la crème est la respiration entre
 * deux masses pleines, et non le fond de toute la page.
 */
export function EnteteEcran({
  retour,
  retourLibelle,
  statement,
  sousTitre,
  chiffre,
}: {
  retour?: string
  retourLibelle?: string
  statement: string
  sousTitre?: string
  /** Le chiffre que le réglage produit. Réel, jamais inventé. */
  chiffre?: string
}) {
  return (
    <header className="sur-plein -mx-6 -mt-10 bg-prune px-6 pt-8 pb-7 text-texte-sur-plein sm:rounded-b-bloc">
      {retour ? (
        <Link
          href={retour}
          className="text-xs font-extrabold text-texte-sur-plein-doux hover:text-texte-sur-plein"
        >
          ‹ {retourLibelle ?? 'Ton activité'}
        </Link>
      ) : null}
      <h1 className="titre mt-1 max-w-xl tracking-tight">{statement}</h1>
      {chiffre ? (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-4">
          <span className="chiffre-heros text-celebration">{chiffre}</span>
          {sousTitre ? (
            <span className="font-semibold text-texte-sur-plein-doux">{sousTitre}</span>
          ) : null}
        </p>
      ) : sousTitre ? (
        <p className="mt-2 max-w-xl text-texte-sur-plein-doux">{sousTitre}</p>
      ) : null}
    </header>
  )
}

/**
 * Une carte de la planche : sur la SURFACE, jamais sur la crème.
 *
 * C'est ce qui la détache du corps de l'écran. Le contenu à gauche, la
 * conséquence à droite, et la valeur de droite ne descend jamais à la ligne :
 * elle est hors du bloc de texte, `shrink-0` comme le veut la planche 14d.
 */
export function CarteEcran({
  principal,
  secondaire,
  valeur,
  chevron = false,
  href,
  attenue = false,
  children,
}: {
  principal: string
  secondaire?: string
  valeur?: string
  chevron?: boolean
  href?: string
  /** Une prestation masquée reste lisible, à 55 % comme sur la planche. */
  attenue?: boolean
  children?: React.ReactNode
}) {
  const contenu = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        {/* Deux lignes au maximum en liste, jamais de troncature au milieu d'un
            mot : le nom complet reste lisible à l'édition. */}
        <span className="line-clamp-2 font-bold">{principal}</span>
        {secondaire ? <span className="text-sm text-texte-attenue">{secondaire}</span> : null}
        {children}
      </span>
      {valeur ? <span className="titre shrink-0 tracking-tight">{valeur}</span> : null}
      {chevron ? (
        <span aria-hidden className="shrink-0 text-texte-attenue">
          ›
        </span>
      ) : null}
    </>
  )
  const classes = `mt-2 flex items-center justify-between gap-4 rounded-carte bg-surface px-4 py-3 ${
    attenue ? 'opacity-55' : ''
  }`
  return href ? (
    <Link href={href} className={`${classes} hover:opacity-80`}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  )
}

/** L'étiquette d'une section, en capitales espacées, comme sur la planche. */
export function EtiquetteSection({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-xs font-bold tracking-widest text-texte-secondaire uppercase">
      {children}
    </h3>
  )
}

/**
 * Le bouton en pointillés, dans le flux de la section.
 *
 * Le board ne le met pas en bas de page ni en tête : il vient après ce qui
 * existe déjà, à la place où l'on ajoute.
 */
export function BoutonPointille({
  href,
  onClick,
  children,
  compact = false,
}: {
  href?: string
  onClick?: () => void
  children: React.ReactNode
  compact?: boolean
}) {
  const classes = `tactile rounded-pilule border-2 border-dashed border-trait-discret font-bold hover:border-prune ${
    compact ? 'px-4' : 'mt-3 flex w-full justify-center px-5'
  }`
  return href ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  )
}

/**
 * L'état vide de la planche 7b : une invitation à agir, jamais un constat
 * triste, et jamais un chiffre à zéro sans contexte.
 *
 * Le substitut de l'avatar est volontairement neutre : le système d'avatars
 * dessinés est un chantier à part, et improviser une illustration ici serait
 * exactement ce que le lot interdit.
 */
export function EtatVide({
  titre,
  invitation,
  children,
}: {
  titre: string
  invitation: string
  children?: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-carte bg-surface p-6 text-center sm:p-8">
      <span
        aria-hidden
        className="mx-auto flex size-14 items-center justify-center rounded-pilule bg-fond text-2xl font-bold text-texte-attenue"
      >
        +
      </span>
      <p className="titre mt-4 tracking-tight">{titre}</p>
      <p className="mt-2 text-texte-secondaire">{invitation}</p>
      {children ? <div className="mt-5 flex justify-center">{children}</div> : null}
    </div>
  )
}
