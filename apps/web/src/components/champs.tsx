'use client'

/** Champs partagés par les écrans d'authentification. Registre : tutoiement. */

export function Champ({
  id,
  label,
  type = 'text',
  autoComplete,
  required = true,
  defaultValue,
  aide,
  fautif = false,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  required?: boolean
  defaultValue?: string
  aide?: string
  /** Champ refusé par la validation : on y pose le curseur et on le signale. */
  fautif?: boolean
}) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        // Le curseur va sur le champ refusé : c'est une réponse à une action
        // de la personne, pas un vol de focus à l'ouverture d'un écran.
        autoFocus={fautif}
        aria-invalid={fautif || undefined}
        aria-describedby={aide ? `${id}-aide` : undefined}
        className={`mt-2 w-full rounded-champ border-2 px-5 py-4 text-lg ${
          fautif ? 'border-erreur' : 'border-trait-discret'
        }`}
      />
      {aide ? (
        <p id={`${id}-aide`} className="mt-2 text-sm text-texte-secondaire">
          {aide}
        </p>
      ) : null}
    </div>
  )
}

export function Erreur({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-5 font-semibold text-erreur">
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
      className="mt-8 w-full rounded-pilule bg-action px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee disabled:opacity-60"
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
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
      />
      {aide ? <p className="mt-2 text-sm text-texte-secondaire">{aide}</p> : null}
    </div>
  )
}

export function Choix({
  id,
  label,
  options,
  defaultValue,
  aide,
}: {
  id: string
  label: string
  options: { valeur: string; texte: string }[]
  defaultValue?: string
  aide?: string
}) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.texte}
          </option>
        ))}
      </select>
      {aide ? <p className="mt-2 text-sm text-texte-secondaire">{aide}</p> : null}
    </div>
  )
}

export function Succes({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="status" className="mt-5 rounded-champ bg-celebration/25 px-5 py-3 font-semibold">
      {message}
    </p>
  )
}
