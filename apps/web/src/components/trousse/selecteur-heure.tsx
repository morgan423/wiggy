'use client'

import { useId } from 'react'
import { usePanneau } from './panneau'
import {
  SURFACE_CHAMP,
  LIBELLE,
  AIDE,
  PANNEAU,
  LIGNE_PANNEAU,
  LIGNE_RETENUE,
  bordure,
} from './styles'

/**
 * Le sélecteur d'heure de Wiggy.
 *
 * Remplace `input[type=time]`, dont le rendu et le clavier changent d'un
 * navigateur à l'autre, et qui oblige à taper deux nombres là où l'on choisit
 * en réalité dans une liste courte.
 *
 * Pas de minute libre : le pas de quinze minutes est celui du moteur de
 * créneaux. Proposer 09:07 laisserait croire à une précision que l'agenda
 * n'utilise pas.
 */

const PAS_MIN = 15

function heures(debut: string, fin: string): string[] {
  const enMinutes = (h: string) => {
    const [a, b] = h.split(':').map(Number)
    return a * 60 + b
  }
  const liste: string[] = []
  for (let m = enMinutes(debut); m <= enMinutes(fin); m += PAS_MIN) {
    liste.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return liste
}

export function SelecteurHeure({
  id,
  label,
  valeur,
  onValeur,
  min = '06:00',
  max = '23:00',
  aide,
  fautif = false,
  desactive = false,
  name,
}: {
  id: string
  label: string
  valeur: string
  onValeur: (valeur: string) => void
  min?: string
  max?: string
  aide?: string
  fautif?: boolean
  desactive?: boolean
  name?: string
}) {
  const { ouvert, setOuvert, contenant } = usePanneau<HTMLDivElement>()
  const idListe = useId()
  const choix = heures(min, max)

  return (
    <div className="mt-5">
      <label htmlFor={id} className={LIBELLE}>
        {label}
      </label>

      <div ref={contenant} className="relative">
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
          onClick={() => {
            setOuvert(!ouvert)
          }}
          className={`${SURFACE_CHAMP} ${bordure(fautif, ouvert)} flex items-center justify-between gap-3 hover:border-prune disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-trait-discret`}
        >
          <span className={valeur ? 'font-mono' : 'text-texte-attenue'}>{valeur || 'Choisir'}</span>
          <span aria-hidden className="shrink-0 text-texte-secondaire">
            ▾
          </span>
        </button>

        {ouvert ? (
          <ul
            id={idListe}
            role="listbox"
            aria-label={label}
            className={`${PANNEAU} max-h-72 overflow-y-auto`}
          >
            {choix.map((heure) => (
              <li key={heure}>
                <button
                  type="button"
                  role="option"
                  aria-selected={heure === valeur}
                  onClick={() => {
                    onValeur(heure)
                    setOuvert(false)
                  }}
                  className={`${LIGNE_PANNEAU} font-mono hover:bg-fond ${heure === valeur ? LIGNE_RETENUE : ''}`}
                >
                  {heure}
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
