import Link from 'next/link'
import type { Metadata } from 'next'
import { copy, remplir } from '@wiggy/copy'
import { placesAmbassadricesRestantes } from '@wiggy/core'
import { sectionAvisAffichable, temoignagesDePlanche } from '@/lib/avis-placeholder'
import { BalisageHome } from './balisage-home'
import { GrillePrix } from './grille-prix'

const S = copy.siteAccueil

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
      <Entete />

      <main>
        <Hero />
        <Bandeau />
        <Probleme />
        <Tournee />
        <Fonctions />
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
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
        <span className="text-[17px] font-extrabold">Wiggy</span>
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
          className="tactile rounded-pilule bg-action px-5 text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
        >
          {S.nav.essayer}
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section data-bande="heros" className="bg-fond pb-16">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-16">
        <div>
          {/* H1 UNIQUE de la page, sur le claim. Toutes les autres sections
              ouvrent en h2 : c'est la seule hiérarchie que le SEO comprend. */}
          <h1 className="statement tracking-tight">{S.hero.claim}</h1>
          <p className="mt-6 max-w-xl text-lg leading-[1.55] text-texte-secondaire">
            {S.hero.sousTitre}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/inscription"
              className="tactile rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol"
            >
              {S.hero.action}
            </Link>
            <a href="#demo" className="tactile text-[15px] font-bold underline">
              {S.hero.demo}
            </a>
          </div>
          <p className="mt-4 text-[12.5px] text-texte-attenue">{S.hero.rassurance}</p>
          <p className="mt-8 border-t border-trait-discret pt-6 text-[13px] font-semibold text-texte-secondaire">
            {S.hero.inclusivite}
          </p>
        </div>
        <VignetteTournee />
      </div>
    </section>
  )
}

/** La tournée de Sophie, en vignette. Données de démonstration, assumées. */
function VignetteTournee() {
  return (
    <div className="rounded-bloc bg-surface p-5 shadow-flottante">
      <p className="text-[15px] font-bold">{S.hero.vignetteTitre}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {S.hero.vignetteRdvs.map((r) => (
          <li
            key={r.heure}
            className="flex items-center gap-3 rounded-carte bg-surface px-3.5 py-3 text-[12.5px]"
          >
            <span className="w-11 shrink-0 font-mono font-bold">{r.heure}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.libelle}</span>
            {'etat' in r && r.etat ? (
              <span
                // Planche 19a : « En cours » PULSE, à 2,4 s. C'est le seul
                // état vivant de la vignette, et c'est ce qui fait comprendre
                // qu'on regarde une journée en train de se dérouler.
                className={`shrink-0 rounded-pilule px-2.5 py-1 text-[10.5px] font-extrabold text-texte-sur-miel ${
                  r.etat === 'En cours' ? 'pulsation-courte bg-attente' : 'bg-celebration'
                }`}
              >
                {r.etat}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── 2. Le bandeau défilant ───────────────────────────────────────────── */

function Bandeau() {
  // Répété quatre fois comme la planche : un ruban qui ne se répète pas laisse
  // un trou à droite sur les grands écrans.
  const suite = [...S.bandeau, ...S.bandeau, ...S.bandeau, ...S.bandeau]
  return (
    <div data-bande="bandeau" className="overflow-hidden bg-prune py-3.5 text-texte-sur-plein">
      {/*
        Le ruban défile (planche 19a) : `translateX` de 0 à -50 %, 26 s, linéaire,
        infini. Le contenu est DUPLIQUÉ, et c'est ce qui rend la boucle
        invisible — arrivé à mi-course, l'image est identique au départ.
        `aria-hidden` sur la copie : un lecteur d'écran n'a pas à entendre deux
        fois la même phrase pour un effet visuel.
      */}
      <p className="ruban-defilant text-[12.5px] font-bold whitespace-nowrap">
        {[false, true].map((copie) => (
          <span key={String(copie)} className="flex shrink-0" aria-hidden={copie || undefined}>
            {suite.map((mot, i) => (
              <span key={i} className="flex shrink-0 items-center gap-4 pr-4">
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
    <section data-bande="probleme" className="bg-surface py-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display max-w-2xl tracking-tight">{S.probleme.titre}</h2>
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
    <section data-bande="tournee" id="produit" className="bg-prune py-20 text-texte-sur-plein">
      <div className="mx-auto max-w-[1180px] px-6">
        {/*
          Planche 19a : « 5 à 10 h » et « La tournée te rend tes soirées » sont
          UN SEUL bloc prune, le chiffre en miel. En faire deux sections, dont
          une sur crème, cassait le rythme de la page et privait le chiffre de
          son fond.
        */}
        <p className="flex flex-wrap items-baseline gap-3 pb-12">
          <span className="chiffre-heros text-celebration">{S.probleme.chiffre}</span>
          <span className="text-[15px] font-semibold">{S.probleme.chiffreLegende}</span>
        </p>
      </div>
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="display tracking-tight">{S.tournee.titre}</h2>
          <p className="mt-5 text-[15px] leading-[1.6] text-texte-sur-plein-doux">
            {S.tournee.texte}
          </p>
          <p className="mt-6 text-[13px] font-bold">{S.tournee.mention}</p>
        </div>
        <Timeline />
      </div>
    </section>
  )
}

/**
 * La timeline. Planche 19a en large, **planche 19c en 390**.
 *
 * En mobile, le rail passe en vertical et le libellé de trajet devient une
 * pastille abricot pâle **posée à cheval sur le rail**, entre deux cartes. Rien
 * n'est coupé, rien ne descend sous 11 px.
 */
function Timeline() {
  return (
    <div className="rounded-bloc bg-fond p-5 text-texte-principal">
      <p className="text-[12px] font-extrabold tracking-widest text-texte-attenue uppercase">
        {S.tournee.jour}
      </p>
      <ol className="relative mt-4 flex flex-col">
        {/* Le rail : un pointillé abricot vertical, motif signature. */}
        <span
          aria-hidden
          className="absolute top-3 bottom-3 left-[7px] w-0.5 border-l-2 border-dotted border-attente"
        />
        {S.tournee.rdvs.map((r, i) => (
          <li key={r.heure} className="relative">
            <div className="flex items-center gap-3 pl-7">
              <span
                aria-hidden
                className="absolute left-0 size-4 rounded-pilule border-2 border-attente bg-fond"
              />
              <span className="w-12 shrink-0 font-mono text-[12.5px] font-bold">{r.heure}</span>
              <span className="min-w-0 flex-1 truncate rounded-carte bg-surface px-3.5 py-3 text-[12.5px] font-semibold">
                {r.libelle}
              </span>
            </div>
            {/* La pastille de trajet, À CHEVAL sur le rail (19c). */}
            {i < S.tournee.trajets.length ? (
              <p
                // Les deux trajets pulsent à 2,8 s, le second DÉCALÉ de 1,4 s
                // (19a) : battre ensemble ferait clignoter la timeline, se
                // décaler donne une tournée qui avance.
                className={`relative z-10 my-1.5 ml-[-4px] w-fit rounded-pilule bg-attente/30 px-2.5 py-1 text-[11px] font-bold text-texte-principal ${
                  i === 0 ? 'pulsation' : 'pulsation-decalee'
                }`}
              >
                {S.tournee.trajets[i]}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── 5. Les fonctions ─────────────────────────────────────────────────── */

function Fonctions() {
  return (
    <section data-bande="fonctions" className="bg-fond py-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display tracking-tight">{S.fonctions.titre}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
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

/* ── 6. Les trois gestes ──────────────────────────────────────────────── */

function Etapes() {
  return (
    <section data-bande="etapes" className="bg-action py-20 text-texte-sur-plein">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display tracking-tight">{S.etapes.titre}</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
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
    <section data-bande="avis" className="bg-fond py-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display tracking-tight">{S.avis.titre}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {temoignages.map((t) => (
            <figure key={t.prenom} className="rounded-carte bg-surface p-6">
              <blockquote className="text-[14px] leading-[1.6] font-semibold">
                « {t.texte} »
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
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
    Le SEUL moment jaune de la page, et c'est ce qui fait exister le programme.
    En prune, il ressemblait à toutes les autres sections sombres.
  */
  return (
    <section
      data-bande="ambassadrices"
      id="ambassadrices"
      className="bg-celebration py-20 text-texte-sur-miel"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <p className="flex flex-wrap items-center gap-3 text-[12px] font-extrabold tracking-widest uppercase">
          <span>{S.ambassadrices.etiquette}</span>
          <span className="rounded-pilule bg-prune px-2.5 py-1 text-texte-sur-plein">
            {S.ambassadrices.places}
          </span>
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <article>
            <h2 className="display tracking-tight">{S.ambassadrices.titre1}</h2>
            <p className="mt-3 text-[14px] leading-[1.6]">{S.ambassadrices.texte1}</p>
          </article>
          <article>
            <h3 className="display tracking-tight">{S.ambassadrices.titre2}</h3>
            <p className="mt-3 text-[14px] leading-[1.6]">{S.ambassadrices.texte2}</p>
          </article>
        </div>
        {/*
          ⚠️ PRINCIPE N°4 : le compteur est BRANCHÉ SUR LE RÉEL, il n'est pas
          écrit en dur. Tant que G2 n'existe pas, il compte zéro conversion et
          affiche donc cinquante ; le jour où G2 arrive, il bouge tout seul. Un
          chiffre inventé sur une page de vente reste un chiffre inventé, même
          quand la promesse qui l'entoure est légitimement en avance (D19).
        */}
        <p className="mt-8 text-[12px] leading-[1.6]">
          {remplir(S.gabarits.ambassadricesMention, { restantes: String(restantes) })}
        </p>
        <Link
          href="/inscription"
          className="tactile mt-6 inline-flex rounded-pilule bg-prune px-7 text-[14px] font-bold text-texte-sur-plein"
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
    <section data-bande="faq" id="faq" className="bg-surface py-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display tracking-tight">{S.faq.titre}</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {S.faq.questions.map((q) => (
            <details key={q.q} className="group rounded-carte bg-surface px-5 py-4">
              <summary className="tactile cursor-pointer list-none text-[14px] font-bold [&::-webkit-details-marker]:hidden">
                {q.q}
              </summary>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-texte-secondaire">{q.r}</p>
            </details>
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
      <section data-bande="demo" id="demo" className="bg-prune py-14 text-texte-sur-plein">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="display tracking-tight">{S.final.demoTitre}</h2>
            <p className="mt-3 text-[15px]">{S.final.demoTexte}</p>
          </div>
          {/*
            ⚠️ Formulaire de composition, sans action serveur : « Réserver une
            démo » est la SEULE promesse de cette page sans ligne de roadmap.
            Signalée sans être corrigée (D19), elle attend l'arbitrage de Morgan.
          */}
          <form className="flex flex-col gap-3" aria-label={S.final.demoAction}>
            <input
              type="text"
              name="prenom"
              placeholder={S.final.demoPrenom}
              className="rounded-champ border-2 border-trait-discret bg-surface px-4 py-3 text-[14px]"
            />
            <input
              type="tel"
              name="telephone"
              placeholder={S.final.demoTelephone}
              className="rounded-champ border-2 border-trait-discret bg-surface px-4 py-3 text-[14px]"
            />
            <button
              type="button"
              className="tactile rounded-pilule bg-action py-3 text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol"
            >
              {S.final.demoAction}
            </button>
          </form>
        </div>
      </section>

      <section data-bande="final" className="bg-fond py-20 text-center">
        <div className="mx-auto max-w-[1180px] px-6">
          <h2 className="display tracking-tight">{S.final.titre}</h2>
          <Link
            href="/inscription"
            className="tactile mt-8 inline-flex rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol"
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
    <footer data-bande="pied" className="bg-prune py-12 text-texte-sur-plein">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-6">
        <span className="text-[15px] font-extrabold">Wiggy</span>
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
