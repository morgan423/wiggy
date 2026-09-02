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
 * La carte crème du board 10c, dans le panneau plein.
 *
 * Le contenu vit dessus, jamais sur la page nue, et les champs vivent sur la
 * surface, jamais sur cette crème : c'est ce qui étage la lecture.
 */
export function CarteCreme({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto mt-8 max-w-xl rounded-bloc bg-fond p-5 text-texte-principal sm:p-7">
      {titre ? <h2 className="titre tracking-tight">{titre}</h2> : null}
      {children}
    </section>
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
 * Une ligne d'état : ce qui est réglé à gauche, sa conséquence à droite.
 *
 * Sur surface, jamais sur la crème : c'est ce qui la détache de la carte qui la
 * porte, exactement comme sur la planche 10c.
 */
export function LigneEtat({
  principal,
  secondaire,
  action,
  href,
}: {
  principal: string
  secondaire?: string
  action?: string
  href?: string
}) {
  const contenu = (
    <>
      <span className="font-bold">{principal}</span>
      {secondaire ? <span className="text-texte-secondaire">{secondaire}</span> : null}
      {action ? <span className="ml-auto font-bold text-action">{action}</span> : null}
    </>
  )
  const classes =
    'mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-carte bg-surface px-5 py-4'
  return href ? (
    <Link href={href} className={`${classes} hover:border-prune`}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  )
}

/** Une pastille prune : les communes de la zone, sur la planche 10c. */
export function Pastille({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pilule bg-prune px-4 py-2 text-sm font-bold text-texte-sur-plein">
      {children}
    </span>
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
  children,
  compact = false,
}: {
  href: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      className={`tactile rounded-pilule border-2 border-dashed border-trait-discret font-bold hover:border-prune ${
        compact ? 'px-4' : 'mt-3 flex w-full justify-center px-5'
      }`}
    >
      {children}
    </Link>
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
