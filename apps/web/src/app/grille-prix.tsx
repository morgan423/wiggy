import Link from 'next/link'
import { copy } from '@wiggy/copy'

const S = copy.siteAccueil
const P = S.prix

/**
 * La grille de prix. Planche 19a en 1180, **planche 19b en 390**.
 *
 * ⚠️ **La hiérarchie CHANGE DE MOTEUR entre les deux.** En large, c'est la
 * position centrale qui porte la mise en avant. Empilée, la position centrale ne
 * porte plus rien : quatre choses la remplacent, et 19b les nomme.
 *
 *   ① **l'ordre** : la préférée ouvre la pile, en premier dans le pouce ;
 *   ② **la masse** : une carte framboise pleine contre deux rangées crème
 *      compactes ;
 *   ③ **le prix** : display 50 contre 22 ;
 *   ④ **le bouton** : le seul plein de la section.
 *
 * Le badge « La préférée » **n'est plus le moteur, il confirme**.
 *
 * Les deux autres offres se déplient au tap, en `<details>` : sans JavaScript,
 * accessible au clavier, et l'écran reste un composant serveur.
 *
 * ⚠️ **Aucune encre atténuée sur la carte framboise.** `texte-sur-plein-doux`
 * y tombe à 3,38:1, sous le seuil AA — relevé par `npm run vues`, pas supposé.
 * C'est la même leçon que sur la rangée d'invite abricot : atténuer hiérarchise
 * sur une surface claire, et EFFACE sur une couleur pleine. Sur cette carte, la
 * hiérarchie passe par la taille et la graisse.
 */
export function GrillePrix() {
  const [essentielle, tournee, intelligence] = P.offres

  /*
    Planche 19a : bloc PRUNE plein, les trois cartes posées dessus. En crème, la
    section se fondait dans le reste de la page et les cartes flottaient.
  */
  return (
    <section data-bande="prix" data-apparait id="tarif" className="bg-prune text-texte-sur-plein">
      {/* Les marges vivent DANS la boîte de 1200, comme sur toutes les autres
          bandes : posées sur la section, elles tombaient hors mesure et la
          grille touchait les deux bords. */}
      <div className="mx-auto w-full max-w-[1200px] px-14 py-16">
        <h2 className="site-offre tracking-tight">{P.titre}</h2>

        {/*
          ── 19a : la grille, à partir de md ──

          Une RANGÉE et non trois colonnes égales : la planche donne `flex: 1.25`
          à la carte mise en avant, qui est donc plus large que ses voisines.
          Une grille à trois parts égales gommait cette différence.
        */}
        <div className="mt-10 hidden gap-5 md:flex md:items-start">
          {P.offres.map((offre) => (
            <CarteLarge key={offre.nom} offre={offre} vedette={offre.nom === tournee.nom} />
          ))}
        </div>

        {/* ── 19b : la pile, sous md. La préférée ouvre. ── */}
        <div className="mt-8 flex flex-col gap-3 md:hidden">
          <CarteVedetteMobile offre={tournee} />
          <RangeeRepliee offre={essentielle} />
          <RangeeRepliee offre={intelligence} />
          <p className="mt-2 text-center text-[11.5px] font-semibold">{P.mentionsMobile}</p>
        </div>

        <ul className="mt-10 hidden flex-wrap justify-center gap-x-6 gap-y-2 md:flex">
          {P.mentions.map((m) => (
            <li key={m} className="text-[12.5px] font-semibold">
              {m}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11.5px] leading-[1.6] text-texte-sur-plein-doux">
          {P.noteSms}
        </p>
      </div>
    </section>
  )
}

type Offre = (typeof P.offres)[number]

/**
 * 19a : la carte de la grille large.
 *
 * ⚠️ **La carte mise en avant DÉBORDE PAR LE HAUT.** Ce sont ses deux voisines
 * qui descendent de 24 px, pas elle qui s'allonge vers le bas : je les avais
 * alignées par le haut, ce qui faisait pendre la vedette sous les autres au
 * lieu de la faire dépasser au-dessus. Le geste est le même, le sens est
 * inverse — une offre qu'on met en avant monte.
 *
 * Elle est aussi **plus large** (`flex: 1.25`) et **plus ombrée**, et son bouton
 * est **prune**, pas miel.
 *
 * Le nom de l'offre est une **pastille prune en capitales**, pas un titre en
 * gras : c'est une étiquette de gamme, et la planche la traite comme telle.
 */
function CarteLarge({ offre, vedette }: { offre: Offre; vedette: boolean }) {
  return (
    <article
      className={`flex flex-col gap-2.5 ${
        vedette
          ? 'flex-[1.25] rounded-[28px] bg-action px-6 py-7 text-texte-sur-plein shadow-flottante'
          : 'mt-6 flex-1 rounded-[24px] bg-fond px-5 py-6 text-texte-principal'
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <span className="self-start rounded-pilule bg-prune px-3 py-[5px] text-[11px] font-extrabold tracking-[0.08em] text-fond uppercase">
          {offre.nom}
        </span>
        {vedette ? (
          <span className="rounded-pilule bg-celebration px-2.5 py-[5px] text-[11px] font-extrabold text-texte-sur-miel">
            {P.badge}
          </span>
        ) : null}
      </header>
      <p className="text-[13px] font-extrabold">{offre.accroche}</p>
      <p className="flex items-baseline gap-1.5">
        {/* 58 sur la vedette, 40 sur les voisines : l'écart de prix se lit
            avant le prix lui-même. */}
        <span
          className={`display tracking-tight ${
            vedette ? 'text-[clamp(2.25rem,4.8vw,3.625rem)]' : 'text-[clamp(1.75rem,3.3vw,2.5rem)]'
          }`}
        >
          {offre.prix}
        </span>
        <span className={`text-[12px] font-bold ${vedette ? '' : 'text-texte-attenue'}`}>
          {P.parMois}
        </span>
      </p>
      {offre.entete ? <p className="text-[13px] font-bold">{offre.entete}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {offre.lignes.map((l) => (
          <li key={l} className="text-[13px] leading-[1.4]">
            {l}
          </li>
        ))}
      </ul>
      <Link
        href="/inscription"
        className={`tactile mt-auto w-full rounded-pilule text-center text-[13px] font-bold ${
          vedette
            ? 'bg-prune text-[14px] text-texte-sur-plein'
            : 'border-[1.5px] border-trait-discret bg-surface text-texte-principal'
        }`}
      >
        {offre.action}
      </Link>
    </article>
  )
}

/**
 * 19b : la carte mise en avant, empilée.
 *
 * ⚠️ **Trois valeurs venaient de mon jugement et non de la planche**, et la
 * grille mobile n'avait jamais été comparée à 19b — `planche:check` est né sur
 * 19a, en 1280, et n'a jamais regardé le 390.
 *
 * · le **nom est une pastille prune en capitales** (10,5 px, 800), pas un titre
 *   de 15 px. C'est une étiquette de gamme, comme en large ;
 * · le **bouton est PRUNE**. Je l'avais en miel : sur une carte framboise, le
 *   miel est la couleur du badge « La préférée » juste au-dessus, et les deux
 *   se disputaient le même rôle ;
 * · le **prix est à 50 px**, une valeur fixe. Je servais la classe `display`,
 *   dont le plancher responsive tombe à 34 px en 390 — le prix y perdait le
 *   quart de sa taille, alors que 19b en fait le troisième moteur de la
 *   hiérarchie empilée.
 */
function CarteVedetteMobile({ offre }: { offre: Offre }) {
  return (
    <article className="flex flex-col gap-2 rounded-[24px] bg-action px-[18px] py-5 text-texte-sur-plein">
      <header className="flex items-center justify-between gap-3">
        <span className="rounded-pilule bg-prune px-2.5 py-[5px] text-[10.5px] font-extrabold tracking-[0.06em] text-fond uppercase">
          {offre.nom}
        </span>
        {/* Le badge confirme, il ne porte plus (19b). */}
        <span className="rounded-pilule bg-celebration px-2.5 py-[5px] text-[10.5px] font-extrabold text-texte-sur-miel">
          {P.badge}
        </span>
      </header>
      <p className="text-[13px] font-extrabold">{offre.accroche}</p>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-[50px] leading-none font-bold tracking-tight whitespace-nowrap">
          {offre.prix}
        </span>
        {/* Les deux refusent de se couper : à 390, « TTC / mois » passait à la
            ligne, ce qui poussait le prix à se couper à son tour et le coupait
            en plein milieu. La planche les tient sur une seule ligne. */}
        <span className="whitespace-nowrap text-[11.5px] font-bold">{P.parMois}</span>
      </p>
      <p className="text-[13px] leading-[1.5]">{offre.resumeMobile}</p>
      {offre.resumeMobile2 ? (
        <p className="text-[13px] leading-[1.5] font-bold">{offre.resumeMobile2}</p>
      ) : null}
      <Link
        href="/inscription"
        className="tactile mt-1 w-full rounded-pilule bg-prune text-center text-[14px] font-bold text-texte-sur-plein"
      >
        {offre.action}
      </Link>
    </article>
  )
}

/**
 * 19b : les deux rangées crème compactes, dépliables au tap.
 *
 * Le nom y est aussi une pastille, d'un cran plus petite (9,5 px) que sur la
 * vedette : la hiérarchie passe par la taille, pas par un changement de forme.
 */
function RangeeRepliee({ offre }: { offre: Offre }) {
  return (
    <details className="group rounded-[18px] bg-fond px-4 py-3.5 text-texte-principal">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 flex-col items-start gap-1">
            <span className="rounded-pilule bg-prune px-2 py-[4px] text-[9.5px] font-extrabold tracking-[0.06em] text-fond uppercase">
              {offre.nom}
            </span>
            <span className="text-[13px] font-extrabold">{offre.accroche}</span>
            <span className="text-[11.5px] text-texte-attenue group-open:hidden">
              {offre.resumeMobile}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="text-[22px] leading-none font-bold">{offre.prix}</span>
            {/* « / mois › » d'un seul tenant sur la planche : le chevron
                appartient à la ligne de prix, il n'est pas un bouton à part. */}
            {/* Le chevron est DANS la chaîne du copy (« / mois › ») : en
                ajouter un ici en faisait deux. */}
            <span className="mt-1 block text-[10.5px] font-bold whitespace-nowrap text-texte-attenue">
              {P.parMoisCourt}
            </span>
          </span>
        </span>
      </summary>
      <ul className="mt-3 flex flex-col gap-2 border-t border-trait-discret pt-3">
        {offre.lignes.map((l) => (
          <li key={l} className="text-[12.5px] leading-[1.5] text-texte-secondaire">
            {l}
          </li>
        ))}
      </ul>
      <Link
        href="/inscription"
        className="tactile mt-3 w-full rounded-pilule border-2 border-trait-discret text-center text-[13px] font-bold"
      >
        {offre.action}
      </Link>
    </details>
  )
}
