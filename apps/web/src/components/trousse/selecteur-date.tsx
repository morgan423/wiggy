'use client'

import { useState } from 'react'
import { usePanneau } from './panneau'
import { SURFACE_CHAMP, LIBELLE, AIDE, PANNEAU, bordure, DESACTIVE } from './styles'

/**
 * Le sélecteur de date de Wiggy.
 *
 * Remplace `input[type=date]`, dont le calendrier appartient au navigateur :
 * surbrillance bleue, typographie système, disposition qui change d'un
 * navigateur à l'autre. C'est le contrôle que la recette a le plus mal vécu.
 *
 * Les dates voyagent en « AAAA-MM-JJ », le format de la base, jamais en objet
 * `Date` : une date de congé est un jour du calendrier, pas un instant, et la
 * convertir en instant lui ferait traverser des fuseaux pour rien.
 */

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

const iso = (a: number, m: number, j: number) =>
  `${a}-${String(m + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`

/**
 * « 14 septembre 2026 », à partir du seul texte, sans jamais fabriquer
 * d'instant : une date de congé est un jour du calendrier, pas un moment.
 *
 * Sans le jour de la semaine, à dessein : « lundi 14 septembre 2026 » se casse
 * sur trois lignes dans une colonne de moitié de largeur, ce qui est le cas
 * courant (deux dates côte à côte). Le calendrier ouvert montre déjà les jours
 * de la semaine en en-tête.
 */
function enClair(valeur: string): string {
  const [a, m, j] = valeur.split('-').map(Number)
  if (!a || !m || !j) return ''
  return `${j} ${MOIS[m - 1]} ${a}`
}

export function SelecteurDate({
  id,
  label,
  valeur,
  onValeur,
  aide,
  fautif = false,
  desactive = false,
  name,
}: {
  id: string
  label: string
  valeur: string
  onValeur: (valeur: string) => void
  aide?: string
  fautif?: boolean
  desactive?: boolean
  name?: string
}) {
  const { ouvert, setOuvert, contenant } = usePanneau<HTMLDivElement>()
  const aujourdhui = new Date()
  const depart = valeur ? valeur.split('-').map(Number) : []
  const [annee, setAnnee] = useState(depart[0] ?? aujourdhui.getFullYear())
  const [mois, setMois] = useState((depart[1] ?? aujourdhui.getMonth() + 1) - 1)

  // Lundi premier, comme partout ailleurs dans le produit.
  const premier = (new Date(Date.UTC(annee, mois, 1)).getUTCDay() + 6) % 7
  const nombreDeJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate()
  const cases = [
    ...Array<null>(premier).fill(null),
    ...Array.from({ length: nombreDeJours }, (_, i) => i + 1),
  ]

  const glisser = (pas: number) => {
    const m = mois + pas
    if (m < 0) {
      setMois(11)
      setAnnee(annee - 1)
    } else if (m > 11) {
      setMois(0)
      setAnnee(annee + 1)
    } else setMois(m)
  }

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
          aria-haspopup="dialog"
          aria-expanded={ouvert}
          aria-invalid={fautif || undefined}
          disabled={desactive}
          onClick={() => {
            setOuvert(!ouvert)
          }}
          className={`${SURFACE_CHAMP} ${bordure(fautif, ouvert)} flex items-center justify-between gap-3 hover:border-prune ${DESACTIVE}`}
        >
          <span className={`truncate ${valeur ? '' : 'text-texte-attenue'}`}>
            {valeur ? enClair(valeur) : 'Choisir une date'}
          </span>
          <span aria-hidden className="shrink-0 text-texte-secondaire">
            ▾
          </span>
        </button>

        {ouvert ? (
          <div className={`${PANNEAU} p-4`} role="dialog" aria-label={label}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Mois précédent"
                onClick={() => {
                  glisser(-1)
                }}
                className="tactile rounded-pilule px-3 font-bold hover:bg-fond"
              >
                ‹
              </button>
              <span className="font-bold capitalize">
                {MOIS[mois]} {annee}
              </span>
              <button
                type="button"
                aria-label="Mois suivant"
                onClick={() => {
                  glisser(1)
                }}
                className="tactile rounded-pilule px-3 font-bold hover:bg-fond"
              >
                ›
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {JOURS.map((jour, i) => (
                <span
                  key={`${jour}-${i}`}
                  aria-hidden
                  className="py-1 text-center text-xs font-bold text-texte-secondaire"
                >
                  {jour}
                </span>
              ))}
              {cases.map((jour, i) =>
                jour === null ? (
                  <span key={`vide-${i}`} />
                ) : (
                  <button
                    key={jour}
                    type="button"
                    onClick={() => {
                      onValeur(iso(annee, mois, jour))
                      setOuvert(false)
                    }}
                    aria-current={iso(annee, mois, jour) === valeur ? 'date' : undefined}
                    className={`flex h-11 items-center justify-center rounded-champ font-semibold transition-colors ${
                      iso(annee, mois, jour) === valeur
                        ? 'bg-action text-texte-sur-plein'
                        : 'hover:bg-fond'
                    }`}
                  >
                    {jour}
                  </button>
                ),
              )}
            </div>
          </div>
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
