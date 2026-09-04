import Link from 'next/link'
import type { Metadata } from 'next'
import { copy, remplir } from '@wiggy/copy'
import { placesAmbassadricesRestantes } from '@wiggy/core'
import { sectionAvisAffichable, temoignagesDePlanche } from '@/lib/avis-placeholder'
import { BalisageHome } from './balisage-home'
import { Apparitions } from '@/components/apparitions'
import { VitrineHeros, VitrineTournee } from './vitrine'
import { Avatar } from '@/components/avatar'
import { AVATAR_HEROS, AVATAR_INCLUSIVITE, AVATARS_AVIS, AVATARS_AMBASSADRICES } from '@wiggy/core'
import { GrillePrix } from './grille-prix'

const S = copy.siteAccueil

/**
 * Le gabarit d'une bande, relevé sur la planche 19a et non choisi.
 *
 * La planche fait 1280 avec 40 de marge extérieure, donc une page de **1200**,
 * et chaque bande porte **64 px en haut et en bas, 56 px sur les côtés**. C'est
 * une grammaire uniforme : je l'avais remplacée par un conteneur centré à 1180
 * avec des marges au jugé, et chaque bande respirait un peu différemment.
 */
/*
  ⚠️ L'ORDRE DES DEUX EST LE SUJET, et je l'avais inversé.

  La planche pose une page de 1200 et met SES MARGES DEDANS : 56 px à gauche et
  à droite du contenu, à l'intérieur de la boîte. J'avais mis la marge sur la
  bande pleine largeur, donc À L'EXTÉRIEUR de la boîte de 1200 : la marge était
  mangée par le vide du navigateur, et le contenu touchait les deux bords de la
  boîte. C'est ce qui collait les interfaces au bord droit.

  La bande ne porte donc plus que sa couleur ; la mesure et les marges vivent
  ensemble, à l'intérieur.
*/
const DEDANS = 'mx-auto w-full max-w-[1200px] px-14 py-16'

/*
  ⚠️ LES TITRES DE BANDE N'ONT PAS TOUS LA MÊME TAILLE, et je les servais tous
  au même palier `display`.

  La planche en donne SEPT différentes : 44 pour les quatre bandes de contenu,
  48 pour les prix, 54 pour l'inclusivité, 38 pour la FAQ, 72 pour la relance
  finale, 104 pour le claim. Elles ne sont pas au hasard : la FAQ se fait plus
  petite parce qu'elle vient tard et qu'on ne la lit pas d'un bloc ; la relance
  finale se fait grande parce qu'elle est le dernier mot. Un palier unique à 56
  écrasait cette respiration — trop gros partout, trop petit sur le claim.

  ⚠️ L'ÉCHELLE RATIFIÉE ET LA PLANCHE SE CONTREDISENT ICI, et je ne tranche pas
  tout seul : `--text-display` plafonne à 56 et `--text-statement` à 92, quand
  la planche écrit 44 et 104. Je n'ai donc PAS touché aux jetons, qui servent
  aussi l'app ; la déviation est locale à cette page et signalée à Morgan.

  La taille est atteinte à 1200 — la mesure de la planche — et décroît sous
  cette largeur, jusqu'à 62 % sur les petits écrans.
*/
/*
  ⚠️ LES CLASSES SONT ÉCRITES EN TOUTES LETTRES, ET C'EST OBLIGATOIRE.

  J'avais d'abord CALCULÉ ces clamps depuis la taille en pixels, ce qui se lit
  très bien et ne marche pas du tout : Tailwind lit le code SOURCE pour savoir
  quelles classes produire, il ne l'exécute pas. Une classe fabriquée à
  l'exécution n'existe dans aucune feuille de style — l'attribut est bien posé
  sur l'élément, l'inspecteur la montre, et elle ne peint rien. Tous les titres
  retombaient donc sur `display`, à 56, exactement l'état que je croyais avoir
  corrigé. Constaté en mesurant le rendu, pas en relisant le code.

  Le prix à payer est cette table ; le prix de l'élégance était une correction
  invisible.
*/
const TITRE_DE_BANDE: Record<number, string> = {
  104: 'display text-[clamp(4.03rem,8.67vw,6.5rem)]',
  72: 'display text-[clamp(2.79rem,6vw,4.5rem)]',
  54: 'display text-[clamp(2.093rem,4.5vw,3.375rem)]',
  44: 'display text-[clamp(1.705rem,3.67vw,2.75rem)]',
  38: 'display text-[clamp(1.473rem,3.17vw,2.375rem)]',
  34: 'display text-[clamp(1.318rem,2.83vw,2.125rem)]',
}
const titreDeBande = (px: number) => TITRE_DE_BANDE[px]

/**
 * wiggy.fr — la home. Planche 19a (composition de référence, 1180), plus les
 * deux états mobiles 19b (grille de prix) et 19c (timeline de tournée).
 *
 * ⚠️ **LA PAGE EST EN `noindex`, et c'est délibéré.** Elle porte trois faux
 * témoignages de composition et renvoie vers des textes légaux provisoires.
 *
 * **COMMENT ON LÈVE LE `noindex`**, parce qu'un interdit qui se lève par oubli
 * n'est pas un interdit. Deux conditions, toutes deux vérifiables :
 *   ① la section « Elles l'utilisent en vrai » lit de **vrais avis** (A7),
 *      consentis par les bêta-testeuses. La garde de `avis-placeholder.ts`
 *      disparaît avec eux ;
 *   ② les **textes légaux définitifs** de l'avocat sont en base (G7, jalon J2) :
 *      `legal_documents` porte une version qui n'est plus `-beta`.
 * Alors, et alors seulement, on retire `robots` ci-dessous et on ajoute le
 * balisage `Review` et `AggregateRating`, qui décrirait aujourd'hui des faux.
 */
export const metadata: Metadata = {
  title: 'Wiggy : tes journées, bouclées',
  description: S.hero.sousTitre,
  robots: { index: false, follow: false },
}

export default function Accueil() {
  const restantes = placesAmbassadricesRestantes()

  return (
    <>
      <BalisageHome />
      <Apparitions />
      <Entete />

      <main>
        <Hero />
        <Bandeau />
        <Probleme />
        <Tournee />
        <Fonctions />
        <Inclusivite />
        <Etapes />
        <Avis />
        <GrillePrix />
        <Ambassadrices restantes={restantes} />
        <Faq />
        <Final />
      </main>

      <Pied />
    </>
  )
}

/* ── 1. L'en-tête et le héros ─────────────────────────────────────────── */

const LIEN_NAV = 'text-[13px] font-bold text-texte-secondaire hover:text-texte-principal'

function Entete() {
  return (
    <header data-bande="entete" className="sticky top-0 z-40 bg-fond">
      {/*
        La planche ne met que DEUX enfants dans cette barre : le mot-symbole, et
        un groupe qui contient les liens ET le bouton. Avec `justify-between`,
        ce groupe se ferre donc À DROITE. En avoir fait trois enfants poussait
        les liens au centre, ce qui n'est ni la planche ni un usage.
      */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-14 py-[22px]">
        <span className="mot-symbole">Wiggy</span>
        <div className="flex items-center gap-7">
          <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
            <a href="#produit" className={LIEN_NAV}>
              {S.nav.produit}
            </a>
            <a href="#tarif" className={LIEN_NAV}>
              {S.nav.tarif}
            </a>
            <a href="#ambassadrices" className={LIEN_NAV}>
              {S.nav.ambassadrices}
            </a>
          </nav>
          <Link
            href="/inscription"
            className="tactile rounded-pilule bg-action px-[22px] text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol"
          >
            {S.nav.essayer}
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section data-bande="heros" data-apparait className="bg-fond">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-12 px-14 pt-14 pb-16 md:flex-row">
        {/* `flex: 1.5` contre une carte FIXE de 320 px : la planche ne fait pas
            une grille de fractions, elle pose une carte de largeur donnée. */}
        {/* `max-width: 660px` sur la planche : la colonne ne s'étire plus
            jusqu'à la carte, elle a sa mesure. */}
        <div className="flex max-w-[660px] flex-1 flex-col gap-[22px] md:flex-[1.5]">
          {/* H1 UNIQUE de la page, sur le claim. Toutes les autres sections
              ouvrent en h2 : c'est la seule hiérarchie que le SEO comprend. */}
          <h1 className={`${titreDeBande(104)} statement tracking-tight`}>{S.hero.claim}</h1>
          <p className="max-w-[40ch] text-xl leading-[1.5] text-texte-secondaire">
            {S.hero.sousTitre}
          </p>
          {/*
            La planche groupe l'action et sa phrase de rassurance dans UNE
            colonne, la phrase centrée sous le bouton. Et « Voir une démo » est
            un BOUTON bordé de la même taille, pas un lien souligné posé à côté.
          */}
          {/*
            Les deux boutons côte à côte, et la mention EN FRÈRE en dessous, sur
            la largeur de la colonne. C'est ce que la planche révisée pose, et ça
            règle le défaut de repli : la mention n'appartient plus à la colonne
            d'un bouton, elle ne peut donc plus se glisser entre les deux quand
            la largeur manque. La démo passe simplement dessous.
          */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/inscription"
              className="tactile rounded-pilule bg-action px-[34px] py-[18px] text-center text-[17px] font-bold text-texte-sur-plein hover:bg-action-survol"
            >
              {S.hero.action}
            </Link>
            <a
              href="#demo"
              className="tactile rounded-pilule border border-trait-discret bg-surface px-[34px] py-[18px] text-center text-[17px] font-bold hover:border-prune"
            >
              {S.hero.demo}
            </a>
          </div>
          <p className="text-[12.5px] text-texte-attenue">{S.hero.rassurance}</p>
        </div>
        {/*
          `position: relative` sur le conteneur de 320 : c'est lui qui tient
          l'avatar, que la planche fait DÉBORDER du coin bas-gauche de la carte.
          Il manquait entièrement, et c'est lui qui donne à ce bloc son air
          d'écran habité plutôt que de capture d'écran.
        */}
        <div className="relative w-full shrink-0 md:w-[320px]">
          <VitrineHeros />
          {/*
            L'avatar déborde du coin bas-gauche de la carte. Il était dessiné
            à la main en cinq blocs pleins, faute d'illustration livrée ; les
            huit personnages sont arrivés le 04/09 et le dessin part avec.

            Caché sous `md` : la carte y prend toute la largeur, et un débord
            de 22 px sortirait de l'écran en poussant un défilement horizontal.
          */}
          <Avatar
            nom={S.vitrine.heros.tournee.titre}
            illustration={AVATAR_HEROS}
            diametre={76}
            className="absolute -bottom-[22px] -left-[22px] hidden shadow-[0_4px_14px_rgba(69,23,60,0.25)] md:block"
          />
        </div>
      </div>
    </section>
  )
}

/* ── 2. Le bandeau défilant ───────────────────────────────────────────── */

function Bandeau() {
  // Répété deux fois, puis dupliqué pour la boucle : de quoi couvrir un grand
  // écran sans laisser de trou à droite, et pas plus. Quatre répétitions
  // allongeaient le ruban sans rien ajouter, et l'obligeaient à courir.
  const suite = [...S.bandeau, ...S.bandeau]
  return (
    <div data-bande="bandeau" className="overflow-hidden bg-prune py-[18px] text-texte-sur-plein">
      {/*
        Le ruban défile (planche 19a) : `translateX` de 0 à -50 %, 26 s, linéaire,
        infini. Le contenu est DUPLIQUÉ, et c'est ce qui rend la boucle
        invisible — arrivé à mi-course, l'image est identique au départ.
        `aria-hidden` sur la copie : un lecteur d'écran n'a pas à entendre deux
        fois la même phrase pour un effet visuel.
      */}
      <p className="ruban-defilant text-[13.5px] font-bold whitespace-nowrap">
        {[false, true].map((copie) => (
          <span
            key={String(copie)}
            className="flex shrink-0 gap-14"
            aria-hidden={copie || undefined}
          >
            {suite.map((mot, i) => (
              <span key={i} className="flex shrink-0 items-center gap-14">
                {mot}
                <span aria-hidden className="text-celebration">
                  ·
                </span>
              </span>
            ))}
          </span>
        ))}
      </p>
    </div>
  )
}

/* ── 3. Le problème ───────────────────────────────────────────────────── */

function Probleme() {
  return (
    <section data-bande="probleme" data-apparait className="bg-surface">
      <div className={`${DEDANS} flex flex-col gap-7`}>
        <h2 className={`${titreDeBande(44)} max-w-[22ch] tracking-tight`}>{S.probleme.titre}</h2>
        {/*
          ⚠️ CARTES CRÈME SUR BANDE BLANCHE — je les avais mises en `bg-surface`,
          c'est-à-dire exactement la couleur de leur bande : les cartes
          n'existaient plus, il ne restait que trois colonnes de texte nu. Même
          défaut que les rangées du carrousel du héros, même cause.

          Et le titre de carte est en FRAUNCES 21, pas en sans 15 : c'est ce qui
          fait qu'on lit trois problèmes et non trois entrées de liste.
        */}
        <div className="grid gap-5 md:grid-cols-3">
          {S.probleme.cartes.map((c) => (
            <article key={c.titre} className="flex flex-col gap-2 rounded-[24px] bg-fond p-[22px]">
              <h3 className="titre text-[21px]">{c.titre}</h3>
              <p className="text-[14px] leading-[1.55] text-texte-secondaire">{c.texte}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 4. La tournée ────────────────────────────────────────────────────── */

function Tournee() {
  return (
    <section
      data-bande="tournee"
      data-apparait
      id="produit"
      className="bg-prune text-texte-sur-plein"
    >
      {/*
        Planche 19a : UNE bande, DEUX colonnes. « 5 à 10 h » ouvre la colonne de
        gauche, il n'est pas une ligne pleine largeur au-dessus. La timeline est
        une carte de 300 px, pas une demi-grille.
      */}
      <div className={`${DEDANS} flex flex-col items-center gap-14 md:flex-row`}>
        {/*
          La hiérarchie de la planche, qui n'est pas celle qu'on devinerait : le
          nombre en très grand, puis sa légende en Fraunces PLUS GROSSE que le
          titre qui la suit. C'est le chiffre qui porte la bande, le titre vient
          après. Et le texte est borné à 44 caractères : sans borne, la colonne
          s'étirait jusqu'à la carte et la ligne devenait trop longue à lire.
        */}
        <div className="flex flex-1 flex-col gap-2 md:flex-[1.4]">
          <p className="chiffre-heros text-celebration">{S.probleme.chiffre}</p>
          {/*
            La planche écrit 34 pour la légende et 30 pour le titre : la légende
            est PLUS GROSSE que le titre qu'elle précède. Je l'avais commenté
            sans jamais poser les tailles, et les deux sortaient à 26.
          */}
          <p className="titre text-[clamp(1.5rem,4vw,2.125rem)]">{S.probleme.chiffreLegende}</p>
          <h2 className="titre mt-4 text-[clamp(1.375rem,3.6vw,1.875rem)]">{S.tournee.titre}</h2>
          <p className="max-w-[44ch] text-base leading-[1.6] text-texte-sur-plein-doux">
            {S.tournee.texte}
          </p>
          <p className="text-[13px] font-bold text-texte-sur-plein-doux">{S.tournee.mention}</p>
        </div>
        {/*
          ⚠️ LA CARTE EST CENTRÉE DANS SA MOITIÉ, et c'est ce que Morgan a vu.

          La planche ne pose pas la carte de 300 comme enfant direct de la
          bande : elle la met dans une boîte `flex: 1` qui la CENTRE. J'avais
          supprimé cette boîte, la carte se collait donc au bord droit de la
          bande. Le geste tient en une boîte, et il change tout l'équilibre.
        */}
        <div className="flex w-full flex-1 justify-center">
          <div className="w-full shrink-0 md:w-[300px]">
            <VitrineTournee />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 5. Les fonctions ─────────────────────────────────────────────────── */

function Fonctions() {
  return (
    <section data-bande="fonctions" data-apparait className="bg-fond">
      <div className={`${DEDANS} flex flex-col gap-6`}>
        <h2 className={`${titreDeBande(44)} tracking-tight`}>{S.fonctions.titre}</h2>
        {/* Ici l'inverse : bande crème, cartes blanches. Le titre est en
            Fraunces 20, d'un cran sous celui de « Le soir ». */}
        <div className="grid gap-[18px] md:grid-cols-3">
          {S.fonctions.cartes.map((c) => (
            <article
              key={c.titre}
              className="flex flex-col gap-2 rounded-[24px] bg-surface p-[22px]"
            >
              <h3 className="titre text-[20px]">{c.titre}</h3>
              <p className="text-[13.5px] leading-[1.55] text-texte-secondaire">{c.texte}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 7. L'inclusivité, devenue une bande ──────────────────────────────── */

/**
 * Planche 19a **révisée le 04/09** : « Fait pour tous les cheveux » a quitté le
 * héros, où elle était une mention de bas de bloc, pour devenir **un statement à
 * elle seule** — Fraunces 54, WONK, bornée à 21 caractères, avec « tous les
 * cheveux » en framboise.
 *
 * C'est `npm run planche:check` qui l'a signalée : il comptait quinze bandes sur
 * la planche et quatorze sur la page. Sans lui, la révision serait passée
 * inaperçue jusqu'à ce que quelqu'un compare à l'œil.
 *
 * La coupure du texte est de la MISE EN FORME, pas une réécriture : la chaîne du
 * copy deck est intacte, on la scinde à l'affichage pour colorer trois mots.
 */
function Inclusivite() {
  const [avant, apres] = S.hero.inclusivite.split('tous les cheveux')
  return (
    <section data-bande="inclusivite" data-apparait className="bg-fond">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-14 pb-[72px]">
        {/* La planche incline l'avatar de 4 degrés et l'ombre : posé droit, il
            avait l'air d'une vignette de profil ; penché, c'est une photo
            épinglée. Le détail fait tout le ton de la bande. */}
        <Avatar
          nom={S.hero.inclusivite}
          illustration={AVATAR_INCLUSIVITE}
          diametre={112}
          className="ml-1.5 rotate-[4deg] shadow-[0_10px_28px_rgba(69,23,60,0.18)]"
        />
        <p
          className={`${titreDeBande(54)} max-w-[21ch] tracking-tight [font-variation-settings:var(--wonk)]`}
        >
          {avant}
          <span className="text-action">tous les cheveux</span>
          {apres}
        </p>
      </div>
    </section>
  )
}

/* ── 6. Les trois gestes ──────────────────────────────────────────────── */

function Etapes() {
  return (
    <section data-bande="etapes" data-apparait className="bg-action text-texte-sur-plein">
      <div className={`${DEDANS} flex flex-col gap-6`}>
        <h2 className={`${titreDeBande(44)} tracking-tight`}>{S.etapes.titre}</h2>
        {/*
          ⚠️ IL N'Y A PAS DE CARTE ICI, et j'en avais posé trois.

          La planche pose les trois gestes À MÊME LA BANDE FRAMBOISE : un grand
          chiffre miel en Fraunces 52, un titre, un texte. J'avais mis trois
          cartes blanches avec une pastille numérotée de 36 px, ce qui donnait
          une quatrième famille de cartes sur une page qui en a déjà trois, et
          ce qui enterrait le chiffre — or le chiffre EST le propos : trois
          gestes, on les compte.
        */}
        <ol className="grid gap-5 md:grid-cols-3">
          {S.etapes.liste.map((e, i) => (
            <li key={e.titre} className="flex flex-col gap-2">
              <span className="titre text-[clamp(2.25rem,4.3vw,3.25rem)] leading-none text-celebration">
                {i + 1}
              </span>
              <h3 className="text-[16px] font-extrabold">{e.titre}</h3>
              {/*
                ⚠️ ENCRE PLEINE, pas atténuée. La planche écrit du blanc à 85 %
                ici, ce qui tombe à 3,38:1 sur le framboise — sous AA, relevé
                par `npm run vues`. C'est la troisième fois que la même erreur
                se pose sur cette couleur : atténuer hiérarchise sur une surface
                claire et EFFACE sur une couleur pleine. La hiérarchie passe par
                la taille et la graisse, jamais par l'opacité.
              */}
              <p className="text-[13.5px] leading-[1.55]">{e.texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ── 7. Les avis ──────────────────────────────────────────────────────── */

/**
 * ⚠️ La section **n'existe pas** hors développement. Voir
 * `lib/avis-placeholder.ts` : les témoignages de la planche sont des FAUX, et
 * c'est la structure qui les retient, pas la mémoire de qui déploie.
 */
function Avis() {
  if (!sectionAvisAffichable()) return null
  const temoignages = temoignagesDePlanche()

  return (
    <section data-bande="avis" data-apparait className="bg-fond">
      <div className={`${DEDANS} flex flex-col gap-5`}>
        <h2 className={`${titreDeBande(44)} tracking-tight`}>{S.avis.titre}</h2>
        {/*
          Hauteurs ALIGNÉES : trois citations de longueurs différentes donnaient
          trois cartes en escalier, et le regard lisait le désordre avant les
          mots. La grille étire les cartes, la signature se pose en bas.
        */}
        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {temoignages.map((t) => (
            <figure key={t.prenom} className="flex flex-col rounded-carte bg-surface p-6">
              <blockquote className="text-[14px] leading-[1.6] font-semibold">
                « {t.texte} »
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-5">
                {/*
                  La planche pose un disque de 40 en trait discret et l'initiale
                  en Fraunces atténuée : une place tenue, pas une décoration.
                  En miel plein, trois pastilles vives tiraient l'œil vers les
                  initiales au lieu des témoignages.
                */}
                <Avatar nom={t.prenom} illustration={AVATARS_AVIS[t.prenom]} diametre={40} />
                <span className="text-[12.5px]">
                  <span className="block font-bold">{t.prenom}</span>
                  <span className="text-texte-attenue">{t.contexte}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 rounded-carte bg-attente/25 px-4 py-3 text-[12px] leading-[1.5] font-semibold">
          Témoignages de composition, visibles en développement seulement. Ils ne peuvent pas partir
          en production : le build échoue s’ils sont demandés ailleurs.
        </p>
      </div>
    </section>
  )
}

/* ── 9. Le programme Ambassadrices ────────────────────────────────────── */

/**
 * La médaille du programme, telle que la planche 19a révisée la dessine.
 *
 * Cinq blocs pleins, aucune image : deux rubans framboise inclinés qui
 * dépassent par le bas, un disque prune, un anneau miel en tirets, et un W en
 * Fraunces. Rien à charger, rien à faire signer, et elle suit la couleur du
 * texte sans qu'on la redessine.
 *
 * Décorative de bout en bout : `aria-hidden`. Le programme est déjà nommé par
 * l'étiquette « Programme Ambassadrices » juste à côté ; faire relire « W » par
 * un lecteur d'écran n'ajouterait rien et couperait la phrase.
 */
function Medaille() {
  return (
    <div aria-hidden className="relative h-[106px] w-[92px]">
      {/* Les deux rubans, sous le disque et inclinés en sens contraire. */}
      <span className="absolute bottom-0 left-[19px] h-8 w-[15px] rotate-[16deg] rounded-[3px] bg-action" />
      <span className="absolute right-[19px] bottom-0 h-8 w-[15px] -rotate-[16deg] rounded-[3px] bg-action" />
      <span className="absolute top-0 left-0.5 flex size-[88px] items-center justify-center rounded-pilule bg-prune shadow-[0_6px_18px_rgba(69,23,60,0.28)]">
        <span className="flex size-[72px] items-center justify-center rounded-pilule border-2 border-dashed border-celebration">
          <span className="titre text-[34px] text-celebration [font-variation-settings:var(--wonk)]">
            W
          </span>
        </span>
      </span>
    </div>
  )
}

function Ambassadrices({ restantes }: { restantes: number }) {
  /*
    Planche 19a, relue. Ce bloc était faux dans sa STRUCTURE, pas seulement dans
    sa couleur :

    · « 50 places » est un CHIFFRE HÉROS en Fraunces, pas une petite pastille
      posée à côté d'une étiquette. C'est lui qui porte le bloc ;
    · les deux offres sont UN SEUL paragraphe de 15 px, leurs titres en gras
      dans le fil du texte. J'en avais fait deux colonnes de gros titres, ce qui
      donnait deux promesses concurrentes au lieu d'une mécanique qui se lit ;
    · le bouton est à DROITE, centré verticalement, pas sous le texte.

    Le seul moment jaune de la page : en prune, il ressemblait à toutes les
    autres sections sombres.
  */
  return (
    <section
      data-bande="ambassadrices"
      data-apparait
      id="ambassadrices"
      className="bg-celebration text-texte-sur-miel"
    >
      <div className={`${DEDANS} flex flex-col items-center gap-14 md:flex-row`}>
        <div className="flex flex-1 flex-col gap-3 md:flex-[1.4]">
          <p className="text-[13px] font-bold tracking-[0.12em] uppercase">
            {S.ambassadrices.etiquette}
          </p>
          {/* 96 ici, contre 120 dans la bande tournée : les deux chiffres
              héros de la page n'ont pas le même poids, et la planche le dit. */}
          <p className="chiffre-heros text-[clamp(3.72rem,8vw,6rem)]">{S.ambassadrices.places}</p>
          <p className="max-w-[50ch] text-[15px] leading-[1.6]">
            <strong className="font-extrabold">{S.ambassadrices.titre1}</strong>{' '}
            {S.ambassadrices.texte1}{' '}
            <strong className="font-extrabold">{S.ambassadrices.titre2}</strong>{' '}
            {S.ambassadrices.texte2}
          </p>
          <p className="max-w-[60ch] text-[13px] font-bold opacity-75">
            {remplir(S.gabarits.ambassadricesMention, { restantes: String(restantes) })}
          </p>
        </div>
        {/*
          ⚠️ LA COLONNE DE DROITE N'EST PLUS UN BOUTON SEUL.

          La planche révisée y empile trois choses centrées : une MÉDAILLE,
          le TRIO d'ambassadrices, puis le bouton. Le bouton posé seul face à
          un pavé de texte laissait la moitié droite de la bande vide — c'est
          la seule bande de la page où le miel occupe toute la largeur, et ce
          vide s'y voyait plus qu'ailleurs.
        */}
        <div className="flex flex-1 flex-col items-center gap-[18px]">
          <Medaille />
          {/*
            Les trois se chevauchent de 12 px et portent un anneau miel de 3 px,
            qui les détache les uns des autres autant que du fond. Sans anneau,
            trois disques qui se recouvrent forment une tache.
          */}
          <div className="flex">
            {AVATARS_AMBASSADRICES.map((id, i) => (
              <Avatar
                key={id}
                nom=""
                illustration={id}
                diametre={48}
                className={`border-[3px] border-celebration ${
                  i < AVATARS_AMBASSADRICES.length - 1 ? '-mr-3' : ''
                }`}
              />
            ))}
          </div>
          <Link
            href="/inscription"
            className="tactile shrink-0 rounded-pilule bg-prune px-[34px] py-[18px] text-[17px] font-bold text-texte-sur-plein"
          >
            {S.ambassadrices.action}
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── 10. La FAQ ───────────────────────────────────────────────────────── */

function Faq() {
  return (
    <section data-bande="faq" data-apparait id="faq" className="bg-surface">
      <div className={`${DEDANS} flex flex-col gap-2.5`}>
        <h2 className={`${titreDeBande(38)} tracking-tight`}>{S.faq.titre}</h2>
        {/*
          Les réponses sont TOUJOURS visibles. La planche les montre en clair, et
          une FAQ qui se replie oblige à chercher : la question qu'on se pose
          n'est jamais celle qu'on ouvrirait en premier.
        */}
        {/*
          ⚠️ UN FLUX EN COLONNES, PAS UNE GRILLE.

          Une grille aligne ses RANGÉES : la hauteur d'une rangée est celle de
          sa plus haute carte, si bien qu'une question courte laisse un blanc
          sous elle et que la suivante attend la plus longue pour démarrer.
          `items-start` ne change rien à ça — il colle la carte en haut de sa
          rangée et laisse le blanc dessous. Résultat : des écarts inégaux d'une
          question à l'autre, et deux colonnes qui se regardent au lieu de se
          lire.

          `columns` fait couler les cartes les unes sous les autres avec
          TOUJOURS le même écart, chaque colonne remplie indépendamment. C'est
          ce que la planche montre, et c'est aussi la seule façon d'avoir un
          écart constant sans imposer une hauteur commune aux réponses.

          `break-inside-avoid` empêche une carte d'être coupée en deux par le
          passage à la colonne suivante — sans lui, une question se retrouve en
          haut d'une colonne et sa réponse en bas de l'autre.
        */}
        <div className="mt-3 -mb-2.5 md:columns-2 md:gap-2.5">
          {S.faq.questions.map((q) => (
            <div key={q.q} className="mb-2.5 break-inside-avoid rounded-[16px] bg-fond px-4 py-3.5">
              <p className="text-[13.5px] font-bold">{q.q}</p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-texte-secondaire">{q.r}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 11. La démo, l'appel final et le pied ────────────────────────────── */

function Final() {
  return (
    <>
      <section data-bande="demo" data-apparait id="demo" className="bg-prune text-texte-sur-plein">
        <div className={`${DEDANS} flex flex-col items-center gap-12 md:flex-row`}>
          <div className="flex flex-1 flex-col gap-2.5">
            <h2 className={`${titreDeBande(34)} tracking-tight`}>{S.final.demoTitre}</h2>
            <p className="text-[15px]">{S.final.demoTexte}</p>
          </div>
          {/*
            ⚠️ Formulaire de composition, sans action serveur : « Réserver une
            démo » est la SEULE promesse de cette page sans ligne de roadmap.
            Signalée sans être corrigée (D19), elle attend l'arbitrage de Morgan.
          */}
          {/* La planche pose les trois champs EN LIGNE, pas empilés. */}
          <form
            className="flex w-full flex-col items-center gap-2.5 md:w-auto md:flex-row"
            aria-label={S.final.demoAction}
          >
            <input
              type="text"
              name="prenom"
              placeholder={S.final.demoPrenom}
              className="w-full rounded-pilule bg-fond px-4 py-3 text-[14px] text-texte-principal md:w-40"
            />
            <input
              type="tel"
              name="telephone"
              placeholder={S.final.demoTelephone}
              className="w-full rounded-pilule bg-fond px-4 py-3 text-[14px] text-texte-principal md:w-40"
            />
            <button
              type="button"
              className="tactile w-full shrink-0 rounded-pilule bg-action px-6 text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol md:w-auto"
            >
              {S.final.demoAction}
            </button>
          </form>
        </div>
      </section>

      {/*
        `align-items: flex-start` sur la planche, et « tout-centré banni » dans
        CLAUDE.md : deux fois la même chose, et je l'avais centré.
      */}
      <section data-bande="final" data-apparait className="bg-fond">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4.5 px-14 py-[72px]">
          <h2 className={`${titreDeBande(72)} max-w-[18ch] tracking-tight`}>{S.final.titre}</h2>
          <Link
            href="/inscription"
            className="tactile rounded-pilule bg-action px-[34px] py-[18px] text-[17px] font-bold text-texte-sur-plein hover:bg-action-survol"
          >
            {S.final.action}
          </Link>
        </div>
      </section>
    </>
  )
}

const LIEN_PIED = 'text-[12.5px] text-texte-sur-plein-doux hover:text-texte-sur-plein'

function Pied() {
  return (
    <footer data-bande="pied" data-apparait className="bg-prune text-texte-sur-plein">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-5 px-14 py-11">
        {/* La planche pose le mot-symbole du pied à 40 px, pas à 15 : c'est
            la signature de la page, elle n'est pas une ligne de menu. */}
        <span className="mot-symbole [--mot-symbole:2.5rem]">Wiggy</span>
        <nav className="flex flex-wrap gap-5" aria-label="Pied de page">
          <a href="#produit" className={LIEN_PIED}>
            {S.nav.produit}
          </a>
          <a href="#tarif" className={LIEN_PIED}>
            {S.nav.tarif}
          </a>
          <a href="#ambassadrices" className={LIEN_PIED}>
            {S.nav.ambassadrices}
          </a>
          <a href="#faq" className={LIEN_PIED}>
            {S.nav.faq}
          </a>
          <Link href="/legal/mentions" className={LIEN_PIED}>
            {S.pied.mentions}
          </Link>
          <Link href="/legal/confidentialite" className={LIEN_PIED}>
            {S.pied.confidentialite}
          </Link>
          <Link href="/legal/cgv" className={LIEN_PIED}>
            {S.pied.cgv}
          </Link>
        </nav>
        {/* A2 : le maillage vers les fiches pros. La home ne cannibalise pas
            les requêtes locales, elle y renvoie. */}
        <Link href="/recherche" className="text-[12.5px] font-bold text-celebration underline">
          {S.pied.cliente}
        </Link>
      </div>
    </footer>
  )
}
