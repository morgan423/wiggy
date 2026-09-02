import Link from 'next/link'

/**
 * Les pièces de composition des écrans pro.
 *
 * Source de vérité : les planches `../../Design/planches/14a.html` à `14g.html`,
 * lues valeur par valeur. Rien ici ne vient d'une paraphrase : la planche 14a
 * est « le cadre de la spec, lu une fois, valable pour tous les écrans », et
 * c'est elle qui pose la référence 390 px, le duo header prune + nav prune, la
 * carte sur surface et l'action principale unique.
 *
 * Les couleurs passent toutes par les jetons. Les espacements et les corps de
 * texte, eux, sont ceux des planches : ce sont eux qui font la densité, et
 * c'est la densité qui manquait.
 */

/* Les traits répétés d'un écran à l'autre, écrits une fois. */

/** Rangée sur surface : planche 14a, « cartes surface, hit 44 px min ». */
export const RANGEE =
  'flex items-center justify-between gap-2.5 rounded-carte bg-surface px-3.5 py-[13px]'

/**
 * Le bandeau prune qui ouvre chaque écran.
 *
 * Planche 14c pour le hub (padding 20/18, statement 28 px, sous-titre), 14d à
 * 14g pour les écrans de second niveau (padding 18, lien de retour 12 px en
 * gras, statement 26 px à 4 px sous lui). Statement à gauche, jamais centré.
 *
 * Il déborde la gouttière du corps : sur la planche, le prune touche les bords
 * de l'écran, il n'est pas une carte posée dans une marge.
 */
export function EnteteEcran({
  retour,
  retourLibelle,
  statement,
  sousTitre,
}: {
  retour?: string
  retourLibelle?: string
  statement: string
  sousTitre?: string
}) {
  return (
    <header
      className={`sur-plein -mx-4 -mt-3.5 bg-prune text-texte-sur-plein ${
        retour ? 'p-[18px]' : 'px-[18px] py-5'
      }`}
    >
      {retour ? (
        <Link
          href={retour}
          className="text-[12px] font-extrabold text-texte-sur-plein-doux hover:text-texte-sur-plein"
        >
          ‹ {retourLibelle ?? 'Ton activité'}
        </Link>
      ) : null}
      <h1 className={`titre font-bold tracking-tight ${retour ? 'mt-1' : 'text-[28px]'}`}>
        {statement}
      </h1>
      {sousTitre ? (
        <p className="mt-1 text-[12.5px] text-texte-sur-plein-doux">{sousTitre}</p>
      ) : null}
    </header>
  )
}

/**
 * Le corps de l'écran, sur la crème.
 *
 * Planches 14c à 14g : `padding: 14px 16px`, les éléments séparés de 10 px (le
 * hub, la zone, les journées) ou de 8 px (les listes de 14d). `flex-1` porte
 * l'état vide, qui se centre dans la hauteur restante.
 */
export function CorpsEcran({
  serre = false,
  children,
}: {
  /** Les listes de la planche 14d respirent de 8 px, pas de 10. */
  serre?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-1 flex-col pt-3.5 ${serre ? 'gap-2' : 'gap-2.5'}`}>{children}</div>
  )
}

/**
 * L'étiquette d'une section : 11 px, extra-gras, capitales espacées de 0,08 em,
 * en encre prune 72 %.
 *
 * La couleur est une décision de la planche 14a : le terracotta de la planche
 * 10c sort des écrans, il ne survit que comme couleur d'annotation du board.
 */
export function EtiquetteSection({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-extrabold tracking-[0.08em] text-texte-secondaire uppercase">
      {children}
    </h2>
  )
}

/**
 * Une rangée d'écran : le résumé à gauche, la conséquence à droite.
 *
 * Le hub (14c) n'édite rien, chaque rangée ouvre sa section. Le résumé de
 * droite reste SUR LA MÊME LIGNE que le libellé : c'est ce qui tient la
 * densité. En cas long, c'est le libellé qui passe à deux lignes, et la valeur
 * de droite ne descend jamais avec lui (`shrink-0`, planches 14c et 14d).
 */
export function RangeeEcran({
  principal,
  secondaire,
  resume,
  valeur,
  chevron = false,
  href,
  attenue = false,
  children,
}: {
  principal: string
  /** Le détail, sous le libellé. */
  secondaire?: string
  /** Le résumé de droite, en petit : « de 28 € à 75 € ». */
  resume?: string
  /** Le chiffre de droite, en Fraunces : un prix, un forfait. */
  valeur?: string
  chevron?: boolean
  href?: string
  /** Une prestation masquée reste lisible, à 55 % comme sur la planche. */
  attenue?: boolean
  /** Ce qui remplace la droite : une pastille miel, un interrupteur. */
  children?: React.ReactNode
}) {
  const contenu = (
    <>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[13.5px] leading-[1.35] font-bold">{principal}</span>
        {secondaire ? <span className="text-[11.5px] text-texte-attenue">{secondaire}</span> : null}
      </span>
      {resume || chevron ? (
        <span className="shrink-0 text-[12px] text-texte-attenue">
          {resume}
          {chevron ? (
            <span aria-hidden className={resume ? 'ml-1' : undefined}>
              ›
            </span>
          ) : null}
        </span>
      ) : null}
      {valeur ? <span className="prix shrink-0">{valeur}</span> : null}
      {children}
    </>
  )
  const classes = `${RANGEE} ${attenue ? 'opacity-55' : ''} ${secondaire ? 'items-start' : ''}`
  return href ? (
    <Link href={href} className={`${classes} hover:bg-fond`}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  )
}

/**
 * La pastille miel d'un état acquis : « En ligne » (14c), « Vérifié » (14b).
 *
 * Encre prune sur miel, jamais de blanc : le blanc sur miel est explicitement
 * banni du design system.
 */
export function PastilleEtat({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-pilule bg-celebration px-[9px] py-1 text-[11px] font-extrabold whitespace-nowrap text-texte-sur-miel">
      {children}
    </span>
  )
}

/**
 * L'action principale de l'écran, une par écran au maximum (planche 14a).
 *
 * Désactivée, elle ne devient pas grise : la planche 14d la montre en framboise
 * à 35 %. Elle reste reconnaissable comme l'action, elle dit seulement qu'il
 * manque quelque chose.
 */
export function ActionPrincipale({
  href,
  type,
  onClick,
  desactive = false,
  children,
}: {
  href?: string
  type?: 'submit'
  onClick?: () => void
  desactive?: boolean
  children: React.ReactNode
}) {
  const classes = `tactile w-full rounded-pilule py-[13px] text-center text-[14px] font-bold text-texte-sur-plein ${
    desactive ? 'bg-action/35' : 'bg-action hover:bg-action-survol active:bg-action-pressee'
  }`
  if (href && !desactive) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type ?? 'button'} onClick={onClick} disabled={desactive} className={classes}>
      {children}
    </button>
  )
}

/**
 * Le bouton en pointillés : « + Ajouter une prestation », « + Commune ».
 *
 * Planches 14d, 14e et 14f. Il vient après ce qui existe déjà, à la place où
 * l'on ajoute, jamais en tête ni relégué en pied de page.
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
  const classes = `tactile rounded-pilule border-[1.5px] border-dashed border-texte-principal/30 text-[12.5px] font-bold hover:border-prune ${
    compact ? 'px-[13px] py-2.5' : 'w-full py-[11px]'
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
 * L'état vide : une invitation à agir, centrée dans la hauteur restante.
 *
 * Planches 14d et 14f : le corps passe en `flex: 1; justify-content: center`,
 * le texte est centré, et l'action principale ferme le bloc. C'est le seul
 * endroit où le centrage est permis : il n'y a rien à aligner.
 *
 * L'état vide invite, il n'affiche aucun zéro (annotation de la planche 14c).
 */
export function EtatVide({
  titre,
  invitation,
  children,
}: {
  titre?: string
  invitation: string
  children?: React.ReactNode
}) {
  return (
    <div className="my-auto flex flex-col gap-3 py-6 text-center">
      {titre ? <p className="text-[14px] font-bold">{titre}</p> : null}
      <p className="text-[12.5px] leading-[1.5] text-texte-attenue">{invitation}</p>
      {children}
    </div>
  )
}

/**
 * Le squelette de chargement, défini en 14a et jamais redessiné : des barres
 * sur la carte, pulsation d'opacité, jamais de rotateur plein écran.
 */
export function RangeeSquelette({ largeurs = ['65%', '40%'] }: { largeurs?: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-carte bg-surface px-3.5 py-[13px]">
      {largeurs.map((largeur, i) => (
        <span key={i} className="squelette block h-[11px]" style={{ width: largeur }} />
      ))}
    </div>
  )
}

/**
 * Le panneau des écrans d'authentification, planche 14b.
 *
 * Un PLEIN PRUNE qui occupe l'écran, pas une carte crème : le compte pro
 * s'ouvre sur la couleur de la marque. Le statement en tête, le formulaire
 * sous lui, et les liens de bascule collés au pied.
 *
 * La planche pose son `margin-top: auto` sur un panneau de 380 px : ce qu'il
 * y crée est un intervalle, pas un vide. Porté à la hauteur d'un téléphone, ce
 * même auto ouvrait un océan de prune entre le statement et le premier champ.
 * C'est donc le PIED qui descend, et le formulaire reste sous son statement.
 *
 * Sur ce fond, l'erreur passe en abricot : la brique n'y contraste pas. C'est
 * un cas unique, déclaré par la planche, tenu dans `globals.css`.
 */
export function PanneauAuth({
  statement,
  sousTitre,
  pied,
  children,
}: {
  statement: string
  sousTitre?: React.ReactNode
  /** Les bascules de bas d'écran : mot de passe oublié, changer de compte. */
  pied?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="sur-plein flex flex-1 flex-col gap-3 rounded-bloc bg-prune px-[18px] py-6 text-texte-sur-plein">
      <h1 className="statement-auth">{statement}</h1>
      {sousTitre ? (
        <p className="text-[13px] leading-[1.5] text-texte-sur-plein-doux">{sousTitre}</p>
      ) : null}
      {children}
      {pied ? <div className="mt-auto flex flex-col gap-2 pt-8">{pied}</div> : null}
    </section>
  )
}

/** Le pied d'un écran d'authentification : une bascule, centrée, discrète. */
export function PiedAuth({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-[12px] text-texte-sur-plein-doux">{children}</p>
}
