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
            className={`ecran-vitrine absolute inset-0 flex flex-col gap-2.5 rounded-bloc p-5 px-4 ${classeEcran} ${
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

const CARTE = 'flex items-center gap-2.5 rounded-[14px] bg-surface px-3 py-2.5'
const HEURE = 'text-[13px] font-extrabold'
const LIBELLE = 'text-[12px] font-semibold'

function Titre({ children }: { children: React.ReactNode }) {
  return <p className="titre">{children}</p>
}

function Pastille({ etat }: { etat: string }) {
  return (
    <span
      className={`ml-auto shrink-0 rounded-pilule px-2 py-[3px] text-[10.5px] font-extrabold text-texte-sur-miel ${
        etat === 'En cours' ? 'pulsation-courte bg-attente' : 'bg-celebration'
      }`}
    >
      {etat}
    </span>
  )
}

/* ── Le carrousel du héros ────────────────────────────────────────────── */

export function VitrineHeros() {
  const { tournee, demande, bouclee } = V.heros
  return (
    <Carrousel
      hauteur="h-[240px]"
      fondPoint="bg-prune"
      classeEcran="bg-surface shadow-flottante"
      etiquette={`${tournee.titre} ${demande.titre} ${bouclee.titre}`}
      ecrans={[
        <>
          <Titre>{tournee.titre}</Titre>
          {tournee.rdvs.map((r) => (
            <p key={r.heure} className={CARTE}>
              <span className={HEURE}>{r.heure}</span>
              <span className={LIBELLE}>{r.libelle}</span>
              {'etat' in r && r.etat ? <Pastille etat={r.etat} /> : null}
            </p>
          ))}
        </>,
        <>
          <Titre>{demande.titre}</Titre>
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface px-3 py-2.5">
            <p className="flex items-center gap-2.5">
              <span className="text-[13px] font-extrabold">{demande.prenom}</span>
              <span className="ml-auto rounded-pilule bg-attente px-2 py-[3px] text-[10.5px] font-extrabold text-texte-sur-miel">
                {demande.etat}
              </span>
            </p>
            <p className="text-[12px] font-semibold">{demande.quoi}</p>
            <p className="text-[11.5px] text-texte-secondaire">{demande.ou}</p>
          </div>
          <p className="mt-auto flex gap-2">
            <span className="flex-1 rounded-pilule bg-action py-2 text-center text-[12px] font-bold text-texte-sur-plein">
              {demande.confirmer}
            </span>
            <span className="rounded-pilule border-[1.5px] border-trait-discret px-3 py-2 text-[12px] font-bold">
              {demande.proposer}
            </span>
          </p>
        </>,
        <>
          <Titre>{bouclee.titre}</Titre>
          {bouclee.lignes.map((l) => (
            <p key={l} className={`${CARTE} text-[12px] font-semibold`}>
              {l}
            </p>
          ))}
          <p className="mt-auto text-[13px] font-extrabold text-action">{bouclee.conclusion}</p>
        </>,
      ]}
    />
  )
}

/* ── Le carrousel de la tournée ───────────────────────────────────────── */

export function VitrineTournee() {
  const { jour, propose, semaine } = V.tournee
  return (
    <Carrousel
      hauteur="h-[260px]"
      fondPoint="bg-fond"
      classeEcran="bg-fond text-texte-principal"
      etiquette={`${jour.titre} ${propose.titre} ${semaine.titre}`}
      ecrans={[
        <>
          <Titre>{jour.titre}</Titre>
          {jour.rdvs.map((r, i) => (
            <div key={r.heure} className="flex flex-col gap-2.5">
              <p className={CARTE}>
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
          <Titre>{propose.titre}</Titre>
          <p className={CARTE}>
            <span className={HEURE}>{propose.avant.heure}</span>
            <span className={LIBELLE}>{propose.avant.libelle}</span>
          </p>
          {/* Le créneau proposé : bordé de framboise, c'est la suggestion. */}
          <div className="flex flex-col gap-1 rounded-[14px] border-2 border-action bg-surface px-3 py-2.5">
            <p className="flex items-center gap-2.5">
              <span className={HEURE}>{propose.propose.heure}</span>
              <span className="rounded-pilule bg-action px-2 py-[3px] text-[10.5px] font-extrabold text-texte-sur-plein">
                {propose.propose.etiquette}
              </span>
              <span className="ml-auto text-[11px] font-semibold text-texte-secondaire">
                {propose.propose.delai}
              </span>
            </p>
            <p className={LIBELLE}>{propose.propose.libelle}</p>
          </div>
          <p className={CARTE}>
            <span className={HEURE}>{propose.apres.heure}</span>
            <span className={LIBELLE}>{propose.apres.libelle}</span>
          </p>
          <p className="mt-auto text-[11.5px] font-bold">{propose.mention}</p>
        </>,
        <>
          <Titre>{semaine.titre}</Titre>
          <div className="flex flex-1 items-end gap-2">
            {semaine.jours.map((j, i) => (
              <span key={i} className="flex flex-1 flex-col items-center gap-1.5">
                {/* Des colonnes qui montent : les creux se remplissent. */}
                <span
                  className="w-full rounded-t-[6px] bg-action"
                  style={{ height: `${String([38, 62, 30, 78, 54][i])}%` }}
                />
                <span className="text-[11px] font-extrabold">{j}</span>
              </span>
            ))}
          </div>
          <p className="text-[11.5px] font-bold">{semaine.mention}</p>
        </>,
      ]}
    />
  )
}
