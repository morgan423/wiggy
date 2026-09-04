import { copy } from '@wiggy/copy'

const S = copy.siteAccueil
const V = S.vitrine

/**
 * Les deux carrousels d'interface de la planche 19a révisée.
 *
 * Trois écrans se relaient dans la même carte, et trois points disent où l'on
 * en est. **Aucun script** : 13,5 s pour trois écrans, soit 4,5 s chacun,
 * obtenus par des retards NÉGATIFS. Les trois animations sont identiques et
 * démarrent déjà entamées, donc elles restent en phase pour toujours — un
 * compteur en JavaScript dériverait, et il faudrait le nettoyer au démontage.
 *
 * ⚠️ **Sous `prefers-reduced-motion`, seul le premier écran reste.** Les deux
 * autres portent `opacity: 0` au repos et c'est l'animation qui les amène : sans
 * elle, ils ne s'affichent simplement jamais. Le carrousel dégrade donc en
 * capture fixe, ce qui est exactement ce qu'on veut, et sans une ligne de plus.
 *
 * ⚠️ **LES DEUX CARROUSELS ONT DES FONDS INVERSÉS, et je les avais confondus.**
 * Le héros pose une carte BLANCHE dont les rangées sont CRÈME ; la tournée pose
 * une carte CRÈME dont les rangées sont BLANCHES. J'avais mis `bg-surface` aux
 * rangées des deux, si bien que dans le héros les rangées avaient exactement la
 * couleur de leur carte : elles ne se voyaient pas. C'est le même défaut que
 * les cartes de la bande « Le soir », et il vient de la même cause — une classe
 * partagée là où la planche fait deux choix opposés. La couleur de rangée est
 * donc PASSÉE À CHAQUE CARROUSEL, elle ne peut plus être supposée.
 */
function Carrousel({
  hauteur,
  ecrans,
  fondPoint,
  classeEcran,
  etiquette,
}: {
  hauteur: string
  ecrans: React.ReactNode[]
  /** Prune sur la crème du héros, crème sur le prune de la tournée. */
  fondPoint: string
  classeEcran: string
  etiquette: string
}) {
  return (
    <div>
      <div className={`relative ${hauteur}`} role="img" aria-label={etiquette}>
        {ecrans.map((ecran, i) => (
          <div
            key={i}
            aria-hidden
            className={`ecran-vitrine absolute inset-0 flex flex-col gap-2.5 rounded-bloc px-4 py-5 ${classeEcran} ${
              i === 1 ? 'retard-1 opacity-0' : i === 2 ? 'retard-2 opacity-0' : ''
            }`}
          >
            {ecran}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-3.5 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`point-vitrine size-1.5 rounded-pilule ${fondPoint} ${
              i === 1 ? 'retard-1' : i === 2 ? 'retard-2' : ''
            }`}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Les pièces communes aux six écrans ───────────────────────────────── */

/** La rangée d'un rendez-vous. `fond` est celui de la carte QUI L'ACCUEILLE. */
const rangee = (fond: string) => `flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 ${fond}`
const HEURE = 'text-[13px] font-extrabold'
const LIBELLE = 'text-[12px] font-semibold'
/** Fraunces 20, la taille que la planche donne au titre d'un écran. */
const TITRE_ECRAN = 'titre text-[20px]'

/* ── Le carrousel du héros : carte BLANCHE, rangées CRÈME ─────────────── */

export function VitrineHeros() {
  const { tournee, demande, bouclee } = V.heros
  const RANGEE = rangee('bg-fond')
  const [total, ...faits] = bouclee.lignes
  return (
    <Carrousel
      hauteur="h-[240px]"
      fondPoint="bg-prune"
      classeEcran="bg-surface shadow-flottante"
      etiquette={`${tournee.titre} ${demande.titre} ${bouclee.titre}`}
      ecrans={[
        <>
          <p className={TITRE_ECRAN}>{tournee.titre}</p>
          {tournee.rdvs.map((r) => {
            const enCours = 'etat' in r && r.etat === 'En cours'
            return (
              <p
                key={r.heure}
                /*
                  Le rendez-vous en cours est CERNÉ DE FRAMBOISE sur la planche.
                  C'est le seul liseré de l'écran, et il dit où en est la pro.
                */
                className={`${RANGEE} ${enCours ? 'border-2 border-action' : ''}`}
              >
                <span className={HEURE}>{r.heure}</span>
                <span className={LIBELLE}>{r.libelle}</span>
                {'etat' in r && r.etat ? (
                  <span
                    /*
                      « Terminé » est MIEL, « En cours » est FRAMBOISE et pulse.
                      Je les avais tous les deux en abricot : les deux états se
                      confondaient, et le rendez-vous en cours ne ressortait pas.
                    */
                    className={`ml-auto shrink-0 rounded-pilule px-[7px] py-[3px] text-[9.5px] font-extrabold ${
                      enCours
                        ? 'pulsation-courte bg-action text-texte-sur-plein'
                        : 'bg-celebration text-texte-sur-miel'
                    }`}
                  >
                    {r.etat}
                  </span>
                ) : null}
              </p>
            )
          })}
        </>,
        <>
          <p className={TITRE_ECRAN}>{demande.titre}</p>
          <div className="flex flex-col gap-[3px] rounded-[14px] bg-fond px-3 py-2.5">
            <p className="flex items-center gap-2">
              <span className={HEURE}>{demande.prenom}</span>
              <span className="ml-auto rounded-pilule bg-attente px-[7px] py-[3px] text-[9.5px] font-extrabold text-texte-sur-miel">
                {demande.etat}
              </span>
            </p>
            <p className={LIBELLE}>{demande.quoi}</p>
            <p className="text-[11px] text-texte-secondaire">{demande.ou}</p>
          </div>
          {/*
            La planche empile le bouton plein et le lien : elle ne les met pas
            côte à côte. Deux boutons sur une ligne donnaient deux actions de
            même poids, alors qu'il y a un geste principal et une échappatoire.
          */}
          <p className="rounded-pilule bg-action py-3 text-center text-[13px] font-extrabold text-texte-sur-plein">
            {demande.confirmer}
          </p>
          <p className="text-center text-[11px] font-semibold text-texte-secondaire">
            {demande.proposer}
          </p>
        </>,
        <>
          <p className={TITRE_ECRAN}>{bouclee.titre}</p>
          {/* Le compte de la journée est le CHIFFRE de l'écran : Fraunces 32,
              framboise, sans carte derrière. */}
          <p className="titre text-[32px] leading-none text-action">{total}</p>
          {faits.map((l) => (
            <p key={l} className="flex items-center gap-2 rounded-[14px] bg-fond px-3 py-2.5">
              <span aria-hidden className="size-2 shrink-0 rounded-pilule bg-celebration" />
              <span className="text-[12px] font-bold">{l}</span>
            </p>
          ))}
          <p className="text-[11px] text-texte-secondaire">{bouclee.conclusion}</p>
        </>,
      ]}
    />
  )
}

/* ── Le carrousel de la tournée : carte CRÈME, rangées BLANCHES ───────── */

export function VitrineTournee() {
  const { jour, propose, semaine } = V.tournee
  const RANGEE = rangee('bg-surface')
  return (
    <Carrousel
      hauteur="h-[276px]"
      fondPoint="bg-fond"
      classeEcran="bg-fond text-texte-principal"
      etiquette={`${jour.titre} ${propose.titre} ${semaine.titre}`}
      ecrans={[
        <>
          <p className={TITRE_ECRAN}>{jour.titre}</p>
          {jour.rdvs.map((r, i) => (
            <div key={r.heure} className="flex flex-col gap-2.5">
              {/* Le rendez-vous en cours est cerné de framboise ici aussi : la
                  planche marque la même heure dans les deux cartes. */}
              <p className={`${RANGEE} ${i === 1 ? 'border-2 border-action' : ''}`}>
                <span className={HEURE}>{r.heure}</span>
                <span className={LIBELLE}>{r.libelle}</span>
              </p>
              {i < jour.trajets.length ? (
                <p
                  className={`pl-3.5 text-[11px] font-semibold text-texte-secondaire ${
                    i === 0 ? 'pulsation' : 'pulsation-decalee'
                  }`}
                >
                  <span aria-hidden>· · · </span>
                  {jour.trajets[i]}
                </p>
              ) : null}
            </div>
          ))}
        </>,
        <>
          <p className={TITRE_ECRAN}>{propose.titre}</p>
          <p className={RANGEE}>
            <span className={HEURE}>{propose.avant.heure}</span>
            <span className={LIBELLE}>{propose.avant.libelle}</span>
          </p>
          {/*
            Le créneau proposé est en TIRETS, pas en trait plein : c'est ce qui
            le distingue d'un rendez-vous pris. Un trait plein en aurait fait un
            rendez-vous confirmé, ce que la planche refuse de montrer — Wiggy
            propose, elle dispose.
          */}
          <div className="flex flex-col gap-[3px] rounded-[14px] border-2 border-dashed border-action bg-surface px-3 py-2.5">
            <p className="flex items-center gap-2">
              <span className={HEURE}>{propose.propose.heure}</span>
              <span className={LIBELLE}>{propose.propose.etiquette}</span>
              <span className="ml-auto rounded-pilule bg-action px-[7px] py-[3px] text-[9.5px] font-extrabold text-texte-sur-plein">
                {propose.propose.delai}
              </span>
            </p>
            <p className="text-[11px] text-texte-secondaire">{propose.propose.libelle}</p>
          </div>
          <p className={RANGEE}>
            <span className={HEURE}>{propose.apres.heure}</span>
            <span className={LIBELLE}>{propose.apres.libelle}</span>
          </p>
          <p className="text-[11px] font-semibold text-texte-secondaire">{propose.mention}</p>
        </>,
        <>
          <p className={TITRE_ECRAN}>{semaine.titre}</p>
          <SemaineEmpilee jours={semaine.jours} />
          <p className="text-[11px] font-semibold text-texte-secondaire">{semaine.mention}</p>
        </>,
      ]}
    />
  )
}

/*
  ── L'écran « Ta semaine » ────────────────────────────────────────────────

  ⚠️ CE N'EST PAS UN HISTOGRAMME, et j'en avais fait un.

  J'avais dessiné une barre par jour, de hauteur proportionnelle : un graphique
  de volume. La planche empile des RENDEZ-VOUS — des blocs de hauteur FIXE, un
  par rendez-vous, posés les uns sur les autres et alignés en bas. La différence
  n'est pas décorative : une barre dit « ce jour-là, beaucoup », une pile dit
  « ce jour-là, ces rendez-vous-là », et c'est le second propos qui rend lisible
  le créneau vide en tirets — un trou dans une pile se voit, un trou dans une
  barre n'existe pas.
*/
const SEMAINE = [
  ['bg-action', 'bg-celebration', 'bg-action'],
  ['bg-attente', 'bg-action'],
  ['bg-action', 'bg-action', 'bg-celebration', 'bg-attente'],
  ['bg-celebration', 'bg-action', 'bg-action'],
  ['vide', 'bg-action'],
]

function SemaineEmpilee({ jours }: { jours: readonly string[] }) {
  return (
    <>
      <div className="flex flex-1 items-end gap-2">
        {SEMAINE.map((colonne, j) => (
          <div key={j} className="flex flex-1 flex-col gap-1">
            {colonne.map((bloc, i) => (
              <span
                key={i}
                className={`h-[26px] rounded-[8px] ${
                  bloc === 'vide' ? 'border-2 border-dashed border-texte-secondaire' : bloc
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {jours.map((j, i) => (
          <span key={i} className="flex-1 text-center text-[11px] font-bold text-texte-secondaire">
            {j}
          </span>
        ))}
      </div>
    </>
  )
}
