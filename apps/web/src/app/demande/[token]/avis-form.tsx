'use client'

import { useActionState } from 'react'
import { deposerAvis, type EtatAvis } from './avis-actions'

/**
 * A7 — le dépôt d'avis, sur la page de suivi par jeton.
 *
 * **Pas de compte, pas de second lien.** Le jeton du rendez-vous existe déjà et
 * mène ici : en créer un pour l'avis donnerait deux liens à la même cliente
 * pour le même rendez-vous, et deux occasions de se tromper.
 *
 * ⚠️ **Le prénom seul est demandé**, et le formulaire n'a aucun champ pour un
 * nom de famille : un avis est affiché publiquement. Ce n'est pas une pudeur,
 * c'est le principe fondateur du produit.
 */
export function FormAvis({ token, prenomPro }: { token: string; prenomPro: string }) {
  const [etat, action, enCours] = useActionState<EtatAvis, FormData>(deposerAvis, {
    statut: 'vide',
  })

  if (etat.statut === 'merci') {
    return (
      <p className="mt-8 rounded-carte bg-celebration px-5 py-4 font-semibold text-texte-sur-miel">
        Merci. Votre avis a été transmis à {prenomPro}.
      </p>
    )
  }

  return (
    <form action={action} className="mt-10 border-t border-trait-discret pt-8">
      <h2 className="text-lg font-bold">Comment s’est passé votre rendez-vous ?</h2>
      <p className="mt-1.5 text-[13px] text-texte-secondaire">
        Votre prénom sera affiché, rien d’autre.
      </p>
      <input type="hidden" name="token" value={token} />

      <fieldset className="mt-5">
        <legend className="text-[13px] font-bold">Votre note</legend>
        {/* Des boutons radio, pas des étoiles cliquables en JavaScript : le
            formulaire doit rester utilisable au clavier et sans script. */}
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="tactile size-11 cursor-pointer rounded-pilule border-2 border-trait-discret text-[15px] font-bold has-checked:border-action has-checked:bg-action has-checked:text-texte-sur-plein"
            >
              <input type="radio" name="note" value={n} className="sr-only" required />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block text-[13px] font-bold" htmlFor="prenom">
        Votre prénom
      </label>
      <input
        id="prenom"
        name="prenom"
        required
        maxLength={40}
        autoComplete="given-name"
        className="mt-1.5 w-full rounded-champ border-2 border-trait-discret bg-surface px-4 py-3 text-[14px]"
      />

      <label className="mt-5 block text-[13px] font-bold" htmlFor="texte">
        Un mot, si vous voulez
      </label>
      <textarea
        id="texte"
        name="texte"
        rows={3}
        maxLength={600}
        className="mt-1.5 w-full rounded-champ border-2 border-trait-discret bg-surface px-4 py-3 text-[14px]"
      />

      {etat.statut === 'erreur' ? (
        <p className="mt-3 text-[13px] font-semibold text-erreur">{etat.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={enCours}
        className="tactile mt-6 w-full rounded-pilule bg-action py-3 text-[15px] font-bold text-texte-sur-plein hover:bg-action-survol disabled:bg-action-pressee"
      >
        {enCours ? 'Envoi…' : 'Envoyer mon avis'}
      </button>
    </form>
  )
}
