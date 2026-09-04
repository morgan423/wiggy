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

  return (
    <section id="tarif" className="bg-fond py-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <h2 className="display tracking-tight">{P.titre}</h2>

        {/* ── 19a : la grille, à partir de md ── */}
        <div className="mt-10 hidden gap-5 md:grid md:grid-cols-3 md:items-start">
          {P.offres.map((offre) => (
            <CarteLarge key={offre.nom} offre={offre} vedette={offre.nom === tournee.nom} />
          ))}
        </div>

        {/* ── 19b : la pile, sous md. La préférée ouvre. ── */}
        <div className="mt-8 flex flex-col gap-3 md:hidden">
          <CarteVedetteMobile offre={tournee} />
          <RangeeRepliee offre={essentielle} />
          <RangeeRepliee offre={intelligence} />
          <p className="mt-2 text-center text-[11.5px] font-semibold text-texte-secondaire">
            {P.mentionsMobile}
          </p>
        </div>

        <ul className="mt-10 hidden flex-wrap justify-center gap-x-6 gap-y-2 md:flex">
          {P.mentions.map((m) => (
            <li key={m} className="text-[12.5px] font-semibold text-texte-secondaire">
              {m}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11.5px] leading-[1.6] text-texte-attenue">
          {P.noteSms}
        </p>
      </div>
    </section>
  )
}

type Offre = (typeof P.offres)[number]

/** 19a : la carte de la grille large. La vedette est celle du centre. */
function CarteLarge({ offre, vedette }: { offre: Offre; vedette: boolean }) {
  return (
    <article
      className={`rounded-bloc p-7 ${
        vedette
          ? 'bg-action text-texte-sur-plein shadow-flottante'
          : 'bg-surface text-texte-principal'
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">{offre.nom}</h3>
        {vedette ? (
          <span className="rounded-pilule bg-celebration px-2.5 py-1 text-[10.5px] font-extrabold text-texte-sur-miel">
            {P.badge}
          </span>
        ) : null}
      </header>
      <p className={`mt-1 text-[13px] ${vedette ? '' : 'text-texte-secondaire'}`}>
        {offre.accroche}
      </p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="display tracking-tight">{offre.prix}</span>
        <span className={`text-[12px] font-semibold ${vedette ? '' : 'text-texte-attenue'}`}>
          {P.parMois}
        </span>
      </p>
      {offre.entete ? (
        <p className={`mt-6 text-[12.5px] font-bold ${vedette ? '' : 'text-texte-secondaire'}`}>
          {offre.entete}
        </p>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2.5">
        {offre.lignes.map((l) => (
          <li
            key={l}
            className={`text-[13px] leading-[1.5] ${vedette ? '' : 'text-texte-secondaire'}`}
          >
            {l}
          </li>
        ))}
      </ul>
      <Link
        href="/inscription"
        className={`tactile mt-7 w-full rounded-pilule text-center text-[14px] font-bold ${
          vedette
            ? 'bg-celebration text-texte-sur-miel'
            : 'border-2 border-trait-discret text-texte-principal'
        }`}
      >
        {offre.action}
      </Link>
    </article>
  )
}

/** 19b ② ③ ④ : la masse framboise, le prix en display, le seul bouton plein. */
function CarteVedetteMobile({ offre }: { offre: Offre }) {
  return (
    <article className="rounded-bloc bg-action p-6 text-texte-sur-plein shadow-flottante">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">{offre.nom}</h3>
        {/* Le badge confirme, il ne porte plus (19b). */}
        <span className="rounded-pilule bg-celebration px-2.5 py-1 text-[10.5px] font-extrabold text-texte-sur-miel">
          {P.badge}
        </span>
      </header>
      <p className="mt-1 text-[13px]">{offre.accroche}</p>
      <p className="mt-5 flex items-baseline gap-2">
        <span className="display tracking-tight">{offre.prix}</span>
        <span className="text-[12px] font-semibold">{P.parMois}</span>
      </p>
      <p className="mt-5 text-[13px] leading-[1.55]">{offre.resumeMobile}</p>
      {offre.resumeMobile2 ? (
        <p className="mt-2 text-[13px] leading-[1.55]">{offre.resumeMobile2}</p>
      ) : null}
      <Link
        href="/inscription"
        className="tactile mt-6 w-full rounded-pilule bg-celebration text-center text-[14px] font-bold text-texte-sur-miel"
      >
        {offre.action}
      </Link>
    </article>
  )
}

/** 19b : les deux rangées crème compactes, prix en 22, dépliables au tap. */
function RangeeRepliee({ offre }: { offre: Offre }) {
  return (
    <details className="group rounded-carte bg-surface px-4 py-3.5">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[14px] font-extrabold">{offre.nom}</span>
            <span className="block text-[12px] text-texte-secondaire">{offre.accroche}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="text-[22px] leading-none font-bold">{offre.prix}</span>
            <span className="block text-[11px] text-texte-attenue">{P.parMoisCourt}</span>
          </span>
        </span>
        <span className="mt-1.5 block text-[11.5px] text-texte-attenue group-open:hidden">
          {offre.resumeMobile}
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
