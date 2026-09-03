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
  placeholder,
  libelleCache = false,
}: {
  id: string
  label: string
  defaultValue?: string
  required?: boolean
  inputMode?: 'numeric'
  type?: string
  aide?: string
  placeholder?: string
  /**
   * Le libellé reste dans le DOM pour les lecteurs d'écran, mais sort de la
   * vue : une barre de recherche dit déjà ce qu'elle est par sa forme. Le
   * masquer n'est pas le supprimer, et cette nuance décide de qui peut se
   * servir du champ.
   */
  libelleCache?: boolean
}) {
  return (
    <div className={libelleCache ? undefined : 'mt-3'}>
      <label htmlFor={id} className={libelleCache ? 'sr-only' : LIBELLE}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        className={`${SURFACE_CHAMP} border-transparent`}
      />
      {aide ? <p className={AIDE}>{aide}</p> : null}
    </div>
  )
}
