'use client'

import { useId, useState } from 'react'
import { optionsAvecNeutre, texteDeLaValeur, type OptionSelection } from '@wiggy/core'
import { usePanneau } from './panneau'
import {
  SURFACE_CHAMP,
  LIBELLE,
  AIDE,
  PANNEAU,
  LIGNE_PANNEAU,
  LIGNE_SURVOLEE,
  LIGNE_RETENUE,
  bordure,
  DESACTIVE,
} from './styles'

/**
 * La liste déroulante de Wiggy.
 *
 * Remplace le `select` natif, dont la flèche et le menu appartiennent au
 * système et non au produit : c'est l'un des contrôles que la recette a fait
 * remonter comme étrangers à l'écran.
 *
 * DEUX RÈGLES DE COMPORTEMENT, pas de rendu, issues du défaut R3-1.
 *
 * ① `optionNeutre` est OBLIGATOIRE, et le domaine le vérifie
 *    (`optionsAvecNeutre` lève si le libellé manque). Sans première option
 *    vide, un menu affiche son premier élément et le formulaire présente une
 *    sélection que personne n'a faite.
 *
 * ② Le composant est CONTRÔLÉ : la valeur vient du parent, et c'est le parent
 *    qui en tire les conséquences, pendant son rendu. Il n'existe donc pas de
 *    « chemin du changement » distinct du « chemin du premier rendu » : c'est
 *    le même état, donc les deux ne peuvent pas diverger. L'état affiché est
 *    l'état appliqué, par construction et pas par vigilance.
 */
export function ListeDeroulante({
  id,
  label,
  valeur,
  onValeur,
  options,
  optionNeutre,
  aide,
  fautif = false,
  desactive = false,
  name,
}: {
  id: string
  label: string
  /** L'état retenu, tenu par le parent. C'est lui qui fait foi. */
  valeur: string
  onValeur: (valeur: string) => void
  options: readonly OptionSelection[]
  /** Obligatoire : voir la règle ① ci-dessus. Registre pro, sans nom genré. */
  optionNeutre: string
  aide?: string
  fautif?: boolean
  desactive?: boolean
  /** Nom du champ soumis. Par défaut `id`. */
  name?: string
}) {
  const { ouvert, setOuvert, contenant } = usePanneau<HTMLDivElement>()
  const [survolee, setSurvolee] = useState(0)
  const idListe = useId()

  const toutes = optionsAvecNeutre(optionNeutre, options)
  const texte = texteDeLaValeur(valeur, optionNeutre, options)
  const rang = Math.max(
    0,
    toutes.findIndex((o) => o.valeur === valeur),
  )

  const retenir = (v: string) => {
    onValeur(v)
    setOuvert(false)
  }

  const ouvrir = () => {
    setSurvolee(rang)
    setOuvert(true)
  }

  const auClavier = (e: React.KeyboardEvent) => {
    if (!ouvert) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        ouvrir()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSurvolee((r) => Math.min(r + 1, toutes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSurvolee((r) => Math.max(r - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      retenir(toutes[survolee].valeur)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setSurvolee(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setSurvolee(toutes.length - 1)
    }
  }

  return (
    <div className="mt-5">
      <label htmlFor={id} className={LIBELLE}>
        {label}
      </label>

      <div ref={contenant} className="relative">
        {/* La valeur voyage dans le formulaire par un champ caché : le bouton
            ci-dessous est ce que voit l'utilisatrice, pas ce que lit le
            serveur. */}
        <input type="hidden" name={name ?? id} value={valeur} />

        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={ouvert ? idListe : undefined}
          aria-haspopup="listbox"
          aria-invalid={fautif || undefined}
          disabled={desactive}
          aria-describedby={aide ? `${id}-aide` : undefined}
          onClick={() => {
            if (ouvert) setOuvert(false)
            else ouvrir()
          }}
          onKeyDown={auClavier}
          className={`${SURFACE_CHAMP} ${bordure(fautif, ouvert)} flex items-center justify-between gap-3 hover:border-prune ${DESACTIVE}`}
        >
          <span className={valeur ? '' : 'text-texte-attenue'}>{texte}</span>
          {/* La flèche est à nous : celle du système ne se met pas au thème. */}
          <span aria-hidden className="shrink-0 text-texte-secondaire">
            {ouvert ? '▴' : '▾'}
          </span>
        </button>

        {ouvert ? (
          <ul
            id={idListe}
            role="listbox"
            aria-label={label}
            className={`${PANNEAU} max-h-72 overflow-y-auto`}
          >
            {toutes.map((option, i) => (
              <li key={option.valeur || 'neutre'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.valeur === valeur}
                  onMouseEnter={() => {
                    setSurvolee(i)
                  }}
                  onClick={() => {
                    retenir(option.valeur)
                  }}
                  className={`${LIGNE_PANNEAU} ${i === survolee ? LIGNE_SURVOLEE : ''} ${
                    option.valeur === valeur ? LIGNE_RETENUE : ''
                  } ${option.valeur ? '' : 'text-texte-attenue'}`}
                >
                  {option.texte}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {aide ? (
        <p id={`${id}-aide`} className={AIDE}>
          {aide}
        </p>
      ) : null}
    </div>
  )
}
