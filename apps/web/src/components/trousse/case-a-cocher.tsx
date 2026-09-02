'use client'

import { LIBELLE, AIDE } from './styles'

/**
 * La case à cocher de Wiggy.
 *
 * La case native est bleue, quel que soit le thème : c'est la couleur du
 * système d'exploitation, pas celle du produit, et elle jure sur une page
 * prune et framboise. `appearance-none` la neutralise ; la coche est dessinée
 * par-dessus, et l'élément reste une vraie case à cocher pour le clavier, les
 * lecteurs d'écran et l'envoi du formulaire.
 *
 * Le libellé entier est cliquable, et l'ensemble fait 44 px de haut.
 */
export function CaseACocher({
  id,
  label,
  defaultChecked = false,
  checked,
  onCheck,
  aide,
  desactive = false,
  name,
}: {
  id: string
  label: string
  defaultChecked?: boolean
  checked?: boolean
  onCheck?: (coche: boolean) => void
  aide?: string
  desactive?: boolean
  name?: string
}) {
  return (
    <div className="mt-5">
      <label
        htmlFor={id}
        className={`tactile flex w-full items-center justify-start gap-4 ${
          desactive ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
        }`}
      >
        <span className="relative flex size-6 shrink-0 items-center justify-center">
          <input
            id={id}
            name={name ?? id}
            type="checkbox"
            disabled={desactive}
            defaultChecked={onCheck ? undefined : defaultChecked}
            checked={checked}
            onChange={(e) => {
              onCheck?.(e.target.checked)
            }}
            className="peer size-6 cursor-pointer appearance-none rounded-champ border-2 border-trait-discret bg-surface transition-colors checked:border-action checked:bg-action"
          />
          {/* La coche : dessinée, pour ne dépendre d'aucune police ni d'aucun
              rendu système. Invisible tant que la case ne l'est pas. */}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute size-4 opacity-0 peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-texte-sur-plein)' }}
          >
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </span>
        <span className={LIBELLE}>{label}</span>
      </label>
      {aide ? <p className={`${AIDE} ml-10`}>{aide}</p> : null}
    </div>
  )
}
