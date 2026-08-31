'use client'

import { useActionState } from 'react'
import { rejoindreListeAttente, type EtatInscription } from './actions'

const initial: EtatInscription = { statut: 'vide' }

/**
 * A9 — capture de la demande quand aucune pro n'intervient dans la ville.
 * Registre : vouvoiement chaleureux, on parle à la cliente finale (S6).
 */
export function WaitlistForm({ ville, codeInsee }: { ville: string; codeInsee?: string }) {
  const [etat, action, enCours] = useActionState(rejoindreListeAttente, initial)

  if (etat.statut === 'ok') {
    return (
      <p className="rounded-carte bg-celebration/25 p-6 text-lg font-semibold">{etat.message}</p>
    )
  }

  return (
    <form action={action} className="relative mt-6">
      <input type="hidden" name="ville" value={ville} />
      {codeInsee ? <input type="hidden" name="codeInsee" value={codeInsee} /> : null}

      {/*
        Piège anti-robot : invisible, hors tabulation, ignoré des lecteurs
        d'écran. Une visiteuse ne peut pas le remplir ; un robot le complète.
        `autoComplete="off"` évite qu'un gestionnaire de mots de passe le
        remplisse à la place d'une vraie personne.
      */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="site_web">Ne pas remplir</label>
        <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor="email" className="block text-sm font-semibold">
        Votre adresse e-mail
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.fr"
          aria-describedby={etat.statut === 'erreur' ? 'erreur-email' : undefined}
          className="w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={enCours}
          className="rounded-pilule bg-prune px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-prune-survol disabled:opacity-60"
        >
          {enCours ? 'Un instant…' : 'Prévenez-moi'}
        </button>
      </div>

      {etat.statut === 'erreur' ? (
        <p id="erreur-email" role="alert" className="mt-3 font-semibold text-erreur">
          {etat.message}
        </p>
      ) : null}

      <p className="mt-4 max-w-md text-sm text-texte-secondaire">
        Votre adresse ne sert qu’à vous prévenir de l’ouverture d’un professionnel dans votre ville.
        Vous pouvez demander sa suppression à tout moment.
      </p>
    </form>
  )
}
