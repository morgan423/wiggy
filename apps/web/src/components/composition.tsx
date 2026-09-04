import Link from 'next/link'
import { formatEuros } from '@wiggy/core'

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
 * L'état d'interaction d'une rangée cliquable. **Aucun changement de fond.**
 *
 * La rangée faisait `hover:bg-fond` : au survol, une carte prenait exactement
 * la couleur du corps de l'écran. Elle ne se mettait pas en valeur, elle
 * DISPARAISSAIT dans le fond. La règle qui en sort vaut au-delà de ce cas et
 * vit dans CLAUDE.md : **un état d'interaction n'emprunte jamais une couleur
 * qui sert déjà de fond dans le même écran.**
 *
 * Une rangée se détache donc au lieu de changer de couleur, par deux effets
 * qui restent justes sur n'importe quel fond — le jour où une rangée sera
 * posée sur du blanc ou sur du prune, rien à reprendre :
 *
 * ① **L'élévation.** Rien au repos, l'ombre douce des cartes au survol. La
 *    rangée monte vers la pro plutôt que de se teinter.
 * ② **Le chevron en framboise**, via `group-hover` (voir `RangeeEcran`).
 *
 * ③ **Le pressé, et c'est LUI qui compte.** La bêta tourne sur mobile, où le
 *    survol n'existe pas : l'état qui décide de la qualité perçue est celui du
 *    doigt, pas celui du curseur.
 *
 *    ⚠️ **L'enfoncement n'est PAS écrit ici, et ce n'est pas un oubli.** Il
 *    existe déjà, globalement, dans `globals.css` : tout `button`, tout
 *    `a[href]` et tout `[role=button]` s'enfonce au `--tap-scale` sur
 *    `--duree-tap`, et redevient plat sous `prefers-reduced-motion`. Une
 *    rangée est un lien : elle l'avait donc déjà. Le rajouter ici composerait
 *    avec lui — `scale:` et `transform: scale()` sont deux propriétés qui se
 *    multiplient, et l'appui vaudrait 0,94 au lieu de 0,97.
 *
 *    Ce que l'appui gagne ici, c'est l'ombre : la rangée **repose la sienne**.
 *    Elle monte sous le curseur, elle redescend sous le doigt. Le survol et
 *    l'appui restent donc bien deux réponses distinctes.
 *
 * `duree-tap` sur l'ombre à l'appui, `duree-fondu` au repos : un doigt doit
 * être répondu plus vite que l'œil, une élévation peut être douce.
 */
export const RANGEE_ACTIVABLE =
  'group transition-[box-shadow] duration-[var(--duree-fondu)] hover:shadow-carte active:shadow-none active:duration-[var(--duree-tap)]'

/**
 * Le bandeau prune qui ouvre chaque écran.
 *
 * Trois tailles de statement, celles des planches, et rien entre les deux :
 * 28 px pour le hub (14c), 26 px pour un écran de réglage (14d à 14g), 24 px
 * pour les écrans du jour (16a, 16b, 16d), où la date change tous les jours et
 * n'a pas à crier.
 *
 * `action` est le contrôle en haut à droite, sur la ligne du statement : la
 * bascule « Jour · Semaine » de 16a, les flèches de jour de la tournée.
 * `children` est ce qui vient sous le sous-titre, comme le fil de pastilles
 * de 16d.
 *
 * Il déborde la gouttière du corps : sur la planche, le prune touche les bords
 * de l'écran, il n'est pas une carte posée dans une marge.
 */
export function EnteteEcran({
  retour,
  retourLibelle,
  statement,
  sousTitre,
  variante = 'section',
  vignette,
  cloche,
  action,
  children,
}: {
  retour?: string
  retourLibelle?: string
  statement: string
  sousTitre?: string
  variante?: 'hub' | 'section' | 'jour'
  /**
   * B14 — la cloche s'ajoute à droite du titre, sur chaque écran pro. Elle
   * n'est pas un onglet : un onglet dirait « va ici régulièrement », une cloche
   * dit « il s'est passé quelque chose ».
   */
  cloche?: React.ReactNode
  /**
   * Ce qui accompagne le statement À SA GAUCHE : l'avatar d'une fiche cliente
   * (planche 16c). Il fait corps avec le nom, il ne flotte ni au-dessus ni
   * en dessous du résumé.
   */
  vignette?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  const taille =
    variante === 'hub' ? 'text-[28px]' : variante === 'jour' ? 'text-[24px]' : undefined
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
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {vignette}
          <div className="flex min-w-0 flex-col">
            <h1
              className={`titre font-bold tracking-tight ${retour && !vignette ? 'mt-1' : ''} ${taille ?? ''}`}
            >
              {statement}
            </h1>
            {vignette && sousTitre ? (
              <p className="text-[12.5px] text-texte-sur-plein-doux">{sousTitre}</p>
            ) : null}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          {action}
          {cloche}
        </span>
      </div>
      {sousTitre && !vignette ? (
        <p className="mt-1 text-[12.5px] text-texte-sur-plein-doux">{sousTitre}</p>
      ) : null}
      {children}
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
  resumeDetail,
  valeurCentimes,
  chevron = false,
  href,
  attenue = false,
  invite = false,
  children,
}: {
  principal: string
  /** Le détail, sous le libellé. */
  secondaire?: string
  /** Le résumé de droite, en petit : « 4 prestations ». */
  resume?: string
  /**
   * La SECONDE ligne du résumé, sous la première, alignée à droite.
   *
   * D17 ⑥ — c'est elle qui fait la richesse du hub de 14c, dont le résumé est
   * un bloc de deux lignes et non une ligne unique : « 4 prestations » PUIS
   * « de 28 € à 75 € ». Tout mettre sur une ligne obligeait à choisir, et on
   * perdait à chaque fois la moitié de ce qu'on venait vérifier.
   */
  resumeDetail?: string
  /** Le montant de droite, en Fraunces, en CENTIMES : un prix, un forfait. */
  valeurCentimes?: number
  chevron?: boolean
  href?: string
  /** Une prestation masquée reste lisible, à 55 % comme sur la planche. */
  attenue?: boolean
  /**
   * La rangée ATTEND quelque chose de la pro : elle passe en abricot.
   *
   * C'est déjà la sémantique du système, celle du bloc « À décider » de
   * l'agenda : l'abricot dit « quelque chose t'attend ». Une rangée qui bloque
   * la mise en ligne d'une page publique ne peut pas ressembler à un réglage
   * parmi d'autres, elle s'y noie.
   */
  invite?: boolean
  /** Ce qui remplace la droite : une pastille miel, un interrupteur. */
  children?: React.ReactNode
}) {
  const contenu = (
    <>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[13.5px] leading-[1.35] font-bold">{principal}</span>
        {secondaire ? (
          /*
            Sur une rangée d'invite, le secondaire ne s'atténue PAS : l'encre à
            65 % sur l'abricot tombe à 3,2:1, sous le seuil AA. Relevé par
            `npm run vues`, pas supposé.

            Et le fond de la rangée est justement ce qui décide : atténuer sert
            à hiérarchiser sur une surface claire ; sur une couleur pleine, ça
            ne hiérarchise plus, ça efface.
          */
          <span className={`text-[11.5px] ${invite ? 'opacity-80' : 'text-texte-attenue'}`}>
            {secondaire}
          </span>
        ) : null}
      </span>
      {resume || chevron ? (
        <span className="flex shrink-0 flex-col items-end text-[12px] text-texte-attenue">
          <span className="flex items-center">
            {resume}
            {chevron ? (
              <span
                aria-hidden
                className={`transition-colors group-hover:text-action ${resume ? 'ml-1' : ''}`}
              >
                ›
              </span>
            ) : null}
          </span>
          {resumeDetail ? (
            <span className="text-[11px] leading-[1.3] opacity-80">{resumeDetail}</span>
          ) : null}
        </span>
      ) : null}
      {valeurCentimes !== undefined ? <Prix centimes={valeurCentimes} /> : null}
      {children}
    </>
  )
  // On REMPLACE le fond au lieu d'en ajouter un second : deux classes de fond
  // dans le même attribut, c'est l'ordre du CSS généré qui tranche et non celui
  // de la chaîne. La rangée d'invite restait blanche.
  const base = invite ? RANGEE.replace('bg-surface', 'bg-attente') : RANGEE
  const classes = `${base} ${attenue ? 'opacity-55' : ''} ${secondaire ? 'items-start' : ''}`
  return href ? (
    <Link href={href} className={`${classes} ${RANGEE_ACTIVABLE}`}>
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
      <h1 className="statement-ecran">{statement}</h1>
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

/**
 * Un montant, en Fraunces, à droite d'une rangée. Planches 14d et 14e.
 *
 * **Le seul endroit du produit qui porte la classe `prix`**, et donc la seule
 * porte de l'exception accordée le 03/09 : Fraunces sous 20 px, plancher à
 * 16 px, pour un NOMBRE SEUL. `design:check` refuse la classe ailleurs.
 *
 * Il prend des **centimes**, pas une chaîne. C'est ce qui rend l'exception
 * impossible à détourner : on ne peut pas lui passer du texte, le typage
 * l'interdit avant même le garde-fou.
 */
export function Prix({ centimes }: { centimes: number }) {
  return <span className="prix shrink-0">{formatEuros(centimes)}</span>
}

/**
 * Une rangée qui annonce ce qui n'existe pas encore.
 *
 * D17 demande de POSER les rangées Statistiques et Aide plutôt que de les
 * omettre : la pro doit voir que ça existera, sans tomber sur un 404. Une
 * rangée absente laisse croire que le produit s'arrête là ; une rangée qui
 * mène nulle part est pire encore.
 */
export function RangeeAVenir({ principal, mention }: { principal: string; mention: string }) {
  return (
    <div className={`${RANGEE} opacity-55`}>
      <span className="text-[13.5px] font-bold">{principal}</span>
      <span className="shrink-0 rounded-pilule border-[1.5px] border-texte-principal/25 px-2 py-1 text-[10px] font-extrabold whitespace-nowrap">
        {mention}
      </span>
    </div>
  )
}
