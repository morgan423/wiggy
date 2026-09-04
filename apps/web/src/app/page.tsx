import Link from 'next/link'
import type { Metadata } from 'next'
import { copy, remplir } from '@wiggy/copy'
import { placesAmbassadricesRestantes } from '@wiggy/core'
import { sectionAvisAffichable, temoignagesDePlanche } from '@/lib/avis-placeholder'
import { BalisageHome } from './balisage-home'
import { Apparitions } from '@/components/apparitions'
import { VitrineHeros, VitrineTournee } from './vitrine'
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
const BANDE = 'px-14 py-16'
const DEDANS = 'mx-auto w-full max-w-[1200px]'

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
      <div className={`${DEDANS} flex items-center justify-between px-14 py-[22px]`}>
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
    <section data-bande="heros" data-apparait className="bg-fond pb-16">
      <div className={`${DEDANS} flex flex-col items-center gap-12 px-14 pt-14 pb-16 md:flex-row`}>
        {/* `flex: 1.5` contre une carte FIXE de 320 px : la planche ne fait pas
            une grille de fractions, elle pose une carte de largeur donnée. */}
        {/* `max-width: 660px` sur la planche : la colonne ne s'étire plus
            jusqu'à la carte, elle a sa mesure. */}
        <div className="flex max-w-[660px] flex-1 flex-col gap-[22px] md:flex-[1.5]">
          {/* H1 UNIQUE de la page, sur le claim. Toutes les autres sections
              ouvrent en h2 : c'est la seule hiérarchie que le SEO comprend. */}
          <h1 className="statement tracking-tight">{S.hero.claim}</h1>
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
        <div className="w-full shrink-0 md:w-[320px]">
          <VitrineHeros />
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
    <section data-bande="probleme" data-apparait className={`bg-surface ${BANDE}`}>
      <div className={`${DEDANS} flex flex-col gap-7`}>
        <h2 className="display max-w-[22ch] tracking-tight">{S.probleme.titre}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {S.probleme.cartes.map((c) => (
            <article key={c.titre} className="rounded-carte bg-surface p-6">
              <h3 className="text-[15px] font-bold">{c.titre}</h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-texte-secondaire">{c.texte}</p>
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
      className={`bg-prune text-texte-sur-plein ${BANDE}`}
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
          <p className="titre">{S.probleme.chiffreLegende}</p>
          <h2 className="titre mt-4">{S.tournee.titre}</h2>
          <p className="max-w-[44ch] text-base leading-[1.6] text-texte-sur-plein-doux">
            {S.tournee.texte}
          </p>
          <p className="text-[13px] font-bold text-texte-sur-plein-doux">{S.tournee.mention}</p>
        </div>
        <div className="w-full shrink-0 md:w-[300px]">
          <VitrineTournee />
        </div>
      </div>
    </section>
  )
}

/* ── 5. Les fonctions ─────────────────────────────────────────────────── */

function Fonctions() {
  return (
    <section data-bande="fonctions" data-apparait className={`bg-fond ${BANDE}`}>
      <div className={`${DEDANS} flex flex-col gap-6`}>
        <h2 className="display tracking-tight">{S.fonctions.titre}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {S.fonctions.cartes.map((c) => (
            <article key={c.titre} className="rounded-carte bg-surface p-6">
              <h3 className="text-[15px] font-bold">{c.titre}</h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-texte-secondaire">{c.texte}</p>
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
    <section data-bande="inclusivite" data-apparait className="bg-fond px-14 pb-[72px]">
      <div className={DEDANS}>
        <p className="display max-w-[21ch] tracking-tight [font-variation-settings:var(--wonk)]">
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
    <section
      data-bande="etapes"
      data-apparait
      className={`bg-action text-texte-sur-plein ${BANDE}`}
    >
      <div className={`${DEDANS} flex flex-col gap-6`}>
        <h2 className="display tracking-tight">{S.etapes.titre}</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {S.etapes.liste.map((e, i) => (
            <li key={e.titre} className="rounded-carte bg-surface p-6 text-texte-principal">
              <span className="flex size-9 items-center justify-center rounded-pilule bg-celebration text-[15px] font-extrabold text-texte-sur-miel">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[15px] font-bold">{e.titre}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-texte-secondaire">{e.texte}</p>
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
    <section data-bande="avis" data-apparait className={`bg-fond ${BANDE}`}>
      <div className={`${DEDANS} flex flex-col gap-5`}>
        <h2 className="display tracking-tight">{S.avis.titre}</h2>
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
                <span className="flex size-9 items-center justify-center rounded-pilule bg-celebration text-[14px] font-extrabold text-texte-sur-miel">
                  {t.prenom.slice(0, 1)}
                </span>
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
      className={`bg-celebration text-texte-sur-miel ${BANDE}`}
    >
      <div className={`${DEDANS} flex flex-col items-center gap-14 md:flex-row`}>
        <div className="flex flex-1 flex-col gap-3 md:flex-[1.4]">
          <p className="text-[13px] font-bold tracking-[0.12em] uppercase">
            {S.ambassadrices.etiquette}
          </p>
          <p className="chiffre-heros">{S.ambassadrices.places}</p>
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
        <Link
          href="/inscription"
          className="tactile shrink-0 rounded-pilule bg-prune px-[34px] py-[18px] text-[17px] font-bold text-texte-sur-plein"
        >
          {S.ambassadrices.action}
        </Link>
      </div>
    </section>
  )
}

/* ── 10. La FAQ ───────────────────────────────────────────────────────── */

function Faq() {
  return (
    <section data-bande="faq" data-apparait id="faq" className="bg-surface py-20">
      <div className={`${DEDANS} flex flex-col gap-2.5`}>
        <h2 className="display tracking-tight">{S.faq.titre}</h2>
        {/*
          Les réponses sont TOUJOURS visibles. La planche les montre en clair, et
          une FAQ qui se replie oblige à chercher : la question qu'on se pose
          n'est jamais celle qu'on ouvrirait en premier.
        */}
        <div className="mt-3 grid items-start gap-2.5 md:grid-cols-2">
          {S.faq.questions.map((q) => (
            <div key={q.q} className="rounded-[16px] bg-fond px-4 py-3.5">
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
      <section
        data-bande="demo"
        data-apparait
        id="demo"
        className={`bg-prune text-texte-sur-plein ${BANDE}`}
      >
        <div className={`${DEDANS} flex flex-col items-center gap-12 md:flex-row`}>
          <div className="flex flex-1 flex-col gap-2.5">
            <h2 className="display tracking-tight">{S.final.demoTitre}</h2>
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
      <section data-bande="final" data-apparait className={`bg-fond px-14 py-[72px]`}>
        <div className={`${DEDANS} flex flex-col items-start gap-4.5`}>
          <h2 className="display max-w-[18ch] tracking-tight">{S.final.titre}</h2>
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
    <footer data-bande="pied" data-apparait className="bg-prune px-14 py-11 text-texte-sur-plein">
      <div className={`${DEDANS} flex flex-wrap items-center justify-between gap-5`}>
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
