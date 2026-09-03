import { SURFACE_CHAMP, LIBELLE, AIDE } from './trousse/styles'

/**
 * Un champ de formulaire GET, rendu côté serveur.
 *
 * Il existe parce que `Champ` est un composant client : une recherche par URL
 * n'a besoin d'aucun état, et charger du JavaScript pour un `<input>` qui sera
 * soumis par le navigateur serait payer pour rien.
 *
 * Il vit dans la trousse et non au pied d'un écran (D13) : il était déjà
 * recopié au pied du tunnel de réservation, et deux champs qui se ressemblent
 * finissent toujours par diverger.
 */
export function ChampGet({
  id,
  label,
  defaultValue,
  required = true,
  inputMode,
  type = 'text',
  aide,
}: {
  id: string
  label: string
  defaultValue?: string
  required?: boolean
  inputMode?: 'numeric'
  type?: string
  aide?: string
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
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        className={`${SURFACE_CHAMP} border-transparent`}
      />
      {aide ? <p className={AIDE}>{aide}</p> : null}
    </div>
  )
}
