'use client'

import { useState } from 'react'
import Link from 'next/link'
import { copy } from '@wiggy/copy'
import { SURVOL_PANNEAU } from './trousse/styles'
import { seDeconnecter } from '@/app/(pro)/actions'

/**
 * D17 ④ — le menu du compte, à droite de la cloche.
 *
 * **La répartition : le métier en bas, le compte en haut.** Ce sont deux
 * questions différentes, qu'on ne se pose pas au même moment. « Comment je
 * règle mon activité » se pose en travaillant ; « comment je change mon
 * e-mail » se pose une fois par an. Chaque chose est rangée selon la question à
 * laquelle elle répond, et non selon la table où elle vit.
 *
 * **Le mot « Paramétrage » revient ici**, là où on le cherche : il avait
 * disparu du produit, et une pro qui voulait régler quelque chose n'avait plus
 * aucun mot auquel se raccrocher.
 *
 * « Voir ma page publique » n'y est PAS, et c'est délibéré : c'est un geste
 * fréquent et fier, on regarde sa vitrine, ça ne se cache pas derrière une
 * icône. Elle reste en tête de l'onglet.
 *
 * **Le motif est une SILHOUETTE D'AVATAR** (18a), et le motif du choix est
 * dans la planche : les trois points annoncent des actions sur le contenu de
 * l'écran, le burger annonce une navigation — qui vit déjà en bas, dans les
 * quatre onglets. Les deux mentiraient. La silhouette dit « compte » sans un
 * mot, c'est le code que la cible connaît de ses autres applications.
 *
 * **Dès que la pro a une photo ou un avatar dessiné (14g), il REMPLACE la
 * silhouette** dans le même cercle de 24 px : l'icône devient son visage. Un
 * anneau miel l'entoure quand le menu est ouvert, puisqu'une photo ne peut pas
 * changer de couleur pour dire qu'elle est active.
 */
export function MenuCompte({ avatar }: { avatar?: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  const T = copy.agendaTournee

  // Le menu est un panneau sur surface, posé au-dessus de l'écran : la crème
  // n'y est le fond de rien, le survol s'y détache. D'où `SURVOL_PANNEAU`, la
  // seule porte du produit vers `hover:bg-fond`. Sur une rangée d'écran, le
  // même survol la ferait disparaître dans le corps de la page.
  const ligne = `block w-full rounded-champ px-3 py-2.5 text-left text-[13px] font-bold ${SURVOL_PANNEAU}`

  return (
    <span className="relative">
      <button
        type="button"
        aria-label={T.$aEcrire.menuCompte}
        aria-expanded={ouvert}
        onClick={() => {
          setOuvert(!ouvert)
        }}
        className={`tactile size-11 shrink-0 rounded-pilule hover:bg-fond/12 focus-visible:bg-fond/12 ${
          ouvert ? 'bg-fond/12 text-celebration' : 'text-texte-sur-plein-doux hover:text-fond'
        }`}
      >
        {avatar ? (
          // Le visage de la pro, dans le cercle de 24 px de la silhouette.
          // L'anneau miel remplace le changement de couleur : une photo ne
          // vire pas au miel, mais elle peut être cerclée.
          <span
            className={`flex size-6 rounded-pilule transition-[box-shadow] duration-[var(--duree-fondu)] ${
              ouvert ? 'ring-2 ring-celebration' : ''
            }`}
          >
            {avatar}
          </span>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="currentColor">
            <circle cx="12" cy="8.6" r="3.4" />
            <path d="M12 13.6c-3.9 0-6.4 2-6.4 4.5 0 .9.7 1.4 1.6 1.4h9.6c.9 0 1.6-.5 1.6-1.4 0-2.5-2.5-4.5-6.4-4.5Z" />
          </svg>
        )}
      </button>

      {ouvert ? (
        <>
          {/* Une zone de sortie plein écran : on referme en tapant à côté, ce
              qui est le geste naturel devant un menu ouvert. */}
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => {
              setOuvert(false)
            }}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute top-12 right-0 z-50 w-56 rounded-carte bg-surface p-1.5 text-texte-principal shadow-lg">
            <Link href="/app/compte" className={ligne}>
              {T.$aEcrire.monCompte}
            </Link>
            <Link href="/app/abonnement" className={ligne}>
              {T.$aEcrire.abonnement}
            </Link>
            {/* L'aide avant le paramétrage, comme la planche 18a les range.
                Elle est inerte tant que F1 n'existe pas, et le dit. */}
            <span className={`${ligne} cursor-default opacity-55`}>{T.$aEcrire.aide}</span>
            <Link href="/app/parametrage/reglages" className={ligne}>
              {T.$aEcrire.parametrage}
            </Link>
            {/* La déconnexion quitte le bas de l'onglet pour rejoindre le
                menu : elle concerne le compte, pas l'activité. Le trait la
                détache (18a) : c'est la seule ligne qui fait sortir. */}
            <form action={seDeconnecter} className="mt-1 border-t border-trait-discret pt-1">
              <button type="submit" className={`${ligne} text-erreur`}>
                {T.$aEcrire.deconnexion}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </span>
  )
}
