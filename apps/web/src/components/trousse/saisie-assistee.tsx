'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePanneau } from './panneau'
import {
  SURFACE_CHAMP,
  LIBELLE,
  AIDE,
  PANNEAU,
  LIGNE_PANNEAU,
  LIGNE_SURVOLEE,
  bordure,
  DESACTIVE,
} from './styles'

/**
 * B12 : la saisie assistée.
 *
 * Un seul composant devant, deux sources derrière : le référentiel des communes
 * en base (local et instantané, décision D6) pour la zone d'intervention, et
 * l'API Adresse de l'État (distante) pour les adresses, aux lots suivants.
 *
 * L'ASYMÉTRIE SE TRAITE ICI, PAS DANS LES ÉCRANS. Trois précautions, conçues
 * pour la source distante avant même qu'elle soit branchée, parce que les
 * recréer écran par écran reviendrait à reproduire sur les adresses la panne
 * que D6 vient d'éliminer sur les communes :
 *
 *   ① un délai avant appel, pour ne pas interroger à chaque frappe ;
 *   ② l'annulation des requêtes dépassées : sans elle, une réponse lente pour
 *      « pa » peut écraser une réponse rapide pour « pau », et la liste
 *      affiche le résultat d'une recherche que personne ne fait plus ;
 *   ③ un chemin gracieux : une source qui ne répond pas le dit, et laisse la
 *      saisie intacte. Elle ne vide jamais le champ et ne bloque jamais.
 */

/** Assez pour ne pas interroger sur une lettre, assez court pour rester vif. */
const DELAI_MS = 250
const MINIMUM_CARACTERES = 2

type Chercheur<T> = (terme: string, signal: AbortSignal) => Promise<T[]>

export function SaisieAssistee<T>({
  id,
  label,
  chercher,
  cle,
  rendu,
  onChoix,
  choisi,
  onEffacer,
  placeholder,
  aide,
  desactive = false,
  messageAucun = 'Aucun résultat.',
  messageIndisponible = 'La recherche ne répond pas. Réessaie dans un instant.',
}: {
  id: string
  label: string
  chercher: Chercheur<T>
  /** Identifiant stable d'un résultat, pour les clés de liste. */
  cle: (item: T) => string
  rendu: (item: T) => React.ReactNode
  onChoix: (item: T) => void
  /** Le résultat retenu reste visible, et effaçable. */
  choisi?: React.ReactNode
  onEffacer?: () => void
  placeholder?: string
  aide?: string
  desactive?: boolean
  messageAucun?: string
  messageIndisponible?: string
}) {
  const { ouvert, setOuvert, contenant } = usePanneau<HTMLDivElement>()
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<T[]>([])
  const [survole, setSurvole] = useState(0)
  const [etat, setEtat] = useState<'repos' | 'cherche' | 'indisponible'>('repos')
  const idListe = useId()
  const enCours = useRef<AbortController | null>(null)

  /**
   * La fonction de recherche est tenue dans une référence, et volontairement
   * absente des dépendances de l'effet.
   *
   * Sans cela, un appelant qui passe une fonction en ligne, ce qui est le cas
   * naturel, en crée une nouvelle à chaque rendu : l'effet se relance, le
   * délai est remis à zéro avant d'avoir expiré, et la recherche ne part
   * JAMAIS. Le composant paraît inerte sans qu'aucune erreur ne s'affiche.
   *
   * Un composant dont la justesse dépend de la vigilance de l'appelant est un
   * piège : il marche chez celui qui l'a écrit et meurt en silence ailleurs.
   */
  const chercherRef = useRef(chercher)
  useEffect(() => {
    chercherRef.current = chercher
  })

  useEffect(() => {
    const propre = terme.trim()
    if (propre.length < MINIMUM_CARACTERES) {
      setResultats([])
      setEtat('repos')
      setOuvert(false)
      return
    }

    // ① Le délai : la frappe suivante annule celle-ci avant tout appel.
    const minuterie = setTimeout(() => {
      // ② L'annulation : la requête précédente est abandonnée, sa réponse ne
      //    peut plus écraser celle qu'on attend.
      enCours.current?.abort()
      const controle = new AbortController()
      enCours.current = controle
      setEtat('cherche')

      chercherRef
        .current(propre, controle.signal)
        .then((trouves) => {
          if (controle.signal.aborted) return
          setResultats(trouves)
          setSurvole(0)
          setEtat('repos')
          setOuvert(true)
        })
        .catch((e: unknown) => {
          if (controle.signal.aborted || (e instanceof Error && e.name === 'AbortError')) return
          // ③ Le chemin gracieux : on le dit, on n'efface rien, on ne bloque
          //    rien. La saisie reste, la personne peut réessayer.
          console.error('saisie_assistee_indisponible', e instanceof Error ? e.message : 'inconnue')
          setResultats([])
          setEtat('indisponible')
          setOuvert(true)
        })
    }, DELAI_MS)

    return () => {
      clearTimeout(minuterie)
    }
  }, [terme, setOuvert])

  // Les requêtes en vol meurent avec le composant.
  useEffect(() => () => enCours.current?.abort(), [])

  const retenir = (item: T) => {
    onChoix(item)
    setTerme('')
    setResultats([])
    setOuvert(false)
  }

  const auClavier = (e: React.KeyboardEvent) => {
    if (!ouvert || resultats.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSurvole((r) => Math.min(r + 1, resultats.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSurvole((r) => Math.max(r - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      retenir(resultats[survole])
    }
  }

  return (
    <div className="mt-5">
      <label htmlFor={id} className={LIBELLE}>
        {label}
      </label>

      {choisi ? (
        <div className="mt-2 flex items-center gap-3 rounded-champ border-2 border-prune bg-surface px-5 py-4">
          <span className="text-lg font-semibold">{choisi}</span>
          {onEffacer ? (
            <button
              type="button"
              onClick={onEffacer}
              aria-label="Effacer le choix"
              className="tactile ml-auto rounded-pilule px-3 font-bold text-texte-secondaire hover:text-erreur"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : (
        <div ref={contenant} className="relative">
          <input
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={ouvert}
            aria-controls={ouvert ? idListe : undefined}
            aria-autocomplete="list"
            aria-describedby={aide ? `${id}-aide` : undefined}
            value={terme}
            disabled={desactive}
            placeholder={placeholder}
            onChange={(e) => {
              setTerme(e.target.value)
            }}
            onKeyDown={auClavier}
            className={`${SURFACE_CHAMP} ${bordure(false, ouvert)} hover:border-prune ${DESACTIVE}`}
          />

          {ouvert ? (
            <ul
              id={idListe}
              role="listbox"
              aria-label={label}
              className={`${PANNEAU} max-h-72 overflow-y-auto`}
            >
              {etat === 'indisponible' ? (
                <li className="px-5 py-4 font-semibold text-erreur">{messageIndisponible}</li>
              ) : resultats.length === 0 ? (
                <li className="px-5 py-4 text-texte-secondaire">{messageAucun}</li>
              ) : (
                resultats.map((item, i) => (
                  <li key={cle(item)}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === survole}
                      onMouseEnter={() => {
                        setSurvole(i)
                      }}
                      onClick={() => {
                        retenir(item)
                      }}
                      className={`${LIGNE_PANNEAU} ${i === survole ? LIGNE_SURVOLEE : ''}`}
                    >
                      {rendu(item)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}

      {aide ? (
        <p id={`${id}-aide`} className={AIDE}>
          {etat === 'cherche' ? 'Recherche…' : aide}
        </p>
      ) : null}
    </div>
  )
}
