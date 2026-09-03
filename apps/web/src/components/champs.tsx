'use client'

import { SURFACE_CHAMP, LIBELLE, AIDE, bordure } from './trousse/styles'

/** Champs partagés par les écrans d'authentification. Registre : tutoiement. */

export function Champ({
  id,
  label,
  type = 'text',
  autoComplete,
  required = true,
  defaultValue,
  aide,
  inputMode,
  fautif = false,
  desactive = false,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  required?: boolean
  defaultValue?: string
  aide?: string
  inputMode?: 'numeric' | 'tel'
  /** Champ refusé par la validation : on y pose le curseur et on le signale. */
  fautif?: boolean
  desactive?: boolean
}) {
  return (
    <div className="mt-3">
      <label htmlFor={id} className={LIBELLE}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        disabled={desactive}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        inputMode={inputMode}
        // Le curseur va sur le champ refusé : c'est une réponse à une action
        // de la personne, pas un vol de focus à l'ouverture d'un écran.
        autoFocus={fautif}
        aria-invalid={fautif || undefined}
        aria-describedby={aide ? `${id}-aide` : undefined}
        // Même rectangle que la liste, la date et l'heure : trois classes
        // dupliquées finissent par diverger, et la divergence se voit.
        className={`${SURFACE_CHAMP} ${bordure(fautif, false)} hover:border-prune disabled:cursor-not-allowed disabled:opacity-55`}
      />
      {aide ? (
        <p id={`${id}-aide`} className={AIDE}>
          {aide}
        </p>
      ) : null}
    </div>
  )
}

export function Erreur({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="bandeau-erreur mt-3 rounded-champ bg-erreur px-3.5 py-2.5 text-[12px] font-semibold text-texte-sur-plein"
    >
      {message}
    </p>
  )
}

export function BoutonPrincipal({
  enCours,
  children,
}: {
  enCours: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="tactile mt-4 w-full rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee disabled:bg-action-pressee"
    >
      {enCours ? 'Un instant…' : children}
    </button>
  )
}

export function Zone({
  id,
  label,
  defaultValue,
  rows = 4,
  aide,
}: {
  id: string
  label: string
  defaultValue?: string
  rows?: number
  aide?: string
}) {
  return (
    <div className="mt-3">
      <label htmlFor={id} className={LIBELLE}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        defaultValue={defaultValue}
        className={`${SURFACE_CHAMP} border-transparent`}
      />
      {aide ? <p className={AIDE}>{aide}</p> : null}
    </div>
  )
}

/**
 * Le message de succès, en bloc miel plein.
 *
 * Un quart de teinte sur crème passait inaperçu : la recette 4 l'a signalé,
 * et le board réserve le miel à la célébration. Un enregistrement réussi est
 * une petite célébration, il se voit.
 */
export function Succes({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p
      role="status"
      className="mt-3 rounded-champ bg-celebration px-3.5 py-2.5 text-[13px] font-bold text-texte-sur-miel"
    >
      {message}
    </p>
  )
}
