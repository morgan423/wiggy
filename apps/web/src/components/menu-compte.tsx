'use client'

import { useState } from 'react'
import Link from 'next/link'
import { copy } from '@wiggy/copy'
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
 */
export function MenuCompte() {
  const [ouvert, setOuvert] = useState(false)
  const T = copy.agendaTournee

  const ligne =
    'block w-full rounded-champ px-3 py-2.5 text-left text-[13px] font-bold hover:bg-fond'

  return (
    <span className="relative">
      <button
        type="button"
        aria-label={T.$aEcrire.menuCompte}
        aria-expanded={ouvert}
        onClick={() => {
          setOuvert(!ouvert)
        }}
        className="tactile size-11 shrink-0 rounded-pilule text-texte-sur-plein hover:bg-texte-sur-plein/14"
      >
        {/* Les trois curseurs : c'est l'icône du réglage dans le langage du
            système, et c'est celle que Design a validée pour l'onglet. */}
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M4 7h9a3 3 0 0 1 6 0h1v2h-1a3 3 0 0 1-6 0H4V7Zm16 8h-9a3 3 0 0 0-6 0H4v2h1a3 3 0 0 0 6 0h9v-2Z" />
        </svg>
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
            <Link href="/app/parametrage/reglages" className={ligne}>
              {T.$aEcrire.parametrage}
            </Link>
            <span className={`${ligne} cursor-default opacity-55`}>{T.$aEcrire.aide}</span>
            {/* La déconnexion quitte le bas de l'onglet pour rejoindre le
                menu : elle concerne le compte, pas l'activité. */}
            <form action={seDeconnecter}>
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
