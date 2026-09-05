'use client'

import { useState } from 'react'
import { copy } from '@wiggy/copy'
import { Prix, RANGEE } from '@/components/composition'
import { basculerPrestation, supprimerPrestation } from './actions'
import { FormPrestation, type PrestationEditable } from './form'

/**
 * Une prestation dans la liste (planche 14d), et sa feuille d'édition.
 *
 * ⚠️ **« MODIFIER » MANQUAIT, ET C'ÉTAIT L'ÉCART LE PLUS COÛTEUX DE L'ÉCRAN.**
 * La rangée n'offrait que « Masquer » et « Supprimer » : une prestation ne
 * pouvait pas être corrigée, et surtout ne pouvait plus être RANGÉE — le champ
 * « Groupe » n'existait qu'à la création.
 *
 * La feuille s'ouvre EN PLACE de la rangée plutôt qu'au-dessus d'elle : en 390,
 * la planche la veut plein écran, et une feuille posée par-dessus une liste qui
 * défile demanderait un plan flottant, un piège de focus et une gestion du
 * retour arrière — trois mécaniques pour un écran de paramétrage qu'on ouvre
 * deux fois par an.
 */
/**
 * Les trois actions d'une rangée : même forme, même hauteur, même zone tactile.
 * `contents` efface la boîte du formulaire, qui n'existe que pour porter
 * l'action serveur et n'a rien à peser dans l'alignement.
 */
const ACTION = 'tactile text-texte-attenue hover:text-prune'

export function RangeePrestation({
  prestation,
  prestations,
}: {
  prestation: PrestationEditable
  prestations: readonly { category: string | null }[]
}) {
  const [edite, setEdite] = useState(false)
  const T = copy.agendaTournee
  const ouvrirEdition = () => {
    setEdite(true)
  }

  if (edite) {
    return (
      <li>
        <FormPrestation
          prestations={prestations}
          edite={prestation}
          onFerme={() => {
            setEdite(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className={`${RANGEE} items-start ${prestation.active ? '' : 'opacity-55'}`}>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[13.5px] leading-[1.35] font-bold">{prestation.name}</span>
        <span className="text-[11.5px] text-texte-attenue">{meta(prestation)}</span>
        {/*
          ⚠️ LES TROIS ACTIONS ONT LA MÊME HAUTEUR, et c'est un correctif.
          « Modifier » portait `tactile` — donc 44 px de zone tactile — quand
          les deux autres ne l'avaient pas : il tombait visiblement plus bas que
          ses voisins. Les mettre toutes les trois à la même enseigne règle
          l'alignement ET la zone tactile des deux qui en manquaient.
        */}
        <span className="mt-1 flex items-center gap-3 text-[11.5px] font-bold">
          <button type="button" onClick={ouvrirEdition} className={ACTION}>
            {T.$aEcrire.prestationModifier}
          </button>
          <form action={basculerPrestation} className="contents">
            <input type="hidden" name="id" value={prestation.id} />
            <input type="hidden" name="active" value={String(prestation.active)} />
            <button type="submit" className={ACTION}>
              {prestation.active ? 'Masquer' : 'Réafficher'}
            </button>
          </form>
          <form action={supprimerPrestation} className="contents">
            <input type="hidden" name="id" value={prestation.id} />
            <button type="submit" className={`${ACTION} hover:text-erreur`}>
              Supprimer
            </button>
          </form>
        </span>
      </span>
      {/* Le prix est hors du bloc de texte : il ne descend jamais à la ligne,
          même sur un libellé de deux lignes (planche 14d, cas long). */}
      <Prix centimes={prestation.price_cents} />
    </li>
  )
}

/** « 45 min · visible » ou « 1 h 30 · acompte 30 % », comme la planche 14d. */
function meta(p: PrestationEditable): string {
  const morceaux = [duree(p.duration_min)]
  if (p.category) morceaux.push(p.category)
  if (p.deposit_percent) morceaux.push(`acompte ${String(p.deposit_percent)} %`)
  morceaux.push(p.active ? 'visible' : 'masquée de ta page')
  return morceaux.join(' · ')
}

/** « 45 min », « 1 h 30 » : la planche écrit les longues durées en heures. */
function duree(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m).padStart(2, '0')}`
}
