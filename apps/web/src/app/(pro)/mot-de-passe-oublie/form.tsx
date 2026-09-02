'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { copy, remplir } from '@wiggy/copy'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'
import { demanderCode, changerMotDePasse, type EtatOubli } from './actions'

const A = copy.authentification

export function FormOubli() {
  const [demande, actionDemande, enDemande] = useActionState<EtatOubli, FormData>(demanderCode, {
    statut: 'vide',
  })
  const [changement, actionChangement, enChangement] = useActionState<EtatOubli, FormData>(
    changerMotDePasse,
    { statut: 'vide' },
  )

  if (changement.statut === 'change') {
    return (
      <>
        <p className="mt-4 rounded-carte bg-celebration px-5 py-4 font-bold text-texte-sur-miel">
          Ton mot de passe est changé.
        </p>
        <Link
          href="/connexion"
          className="tactile mt-6 w-full justify-center rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol"
        >
          {A.connexion.bouton}
        </Link>
      </>
    )
  }

  if (demande.statut !== 'code-envoye') {
    return (
      <form action={actionDemande}>
        {/* Piège anti-robot : cet écran est atteignable sans être connecté,
            c'est la cible même de la fraude au pompage de SMS. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden">
          <label htmlFor="site_web">Ne pas remplir</label>
          <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <Champ id="email" label={A.$aEcrire.emailChamp} type="email" autoComplete="email" />
        <Erreur message={demande.statut === 'erreur' ? demande.message : undefined} />
        <BoutonPrincipal enCours={enDemande}>Recevoir le code</BoutonPrincipal>
      </form>
    )
  }

  return (
    <form action={actionChangement}>
      {demande.codeDeDeveloppement ? (
        <p className="mt-3 rounded-carte bg-attente px-5 py-3 font-bold text-texte-sur-miel">
          {remplir(A.$aEcrire.codeDeveloppement, { code: demande.codeDeDeveloppement })}
        </p>
      ) : null}
      <Champ id="email" label={A.$aEcrire.emailChamp} type="email" autoComplete="email" />
      <Champ id="code" label="Le code reçu" inputMode="numeric" autoComplete="one-time-code" />
      <Champ
        id="motDePasse"
        label={A.oubli.nouveauMotDePasse}
        type="password"
        autoComplete="new-password"
        aide={A.inscription.aideMotDePasse}
      />
      <Erreur message={changement.statut === 'erreur' ? changement.message : undefined} />
      <BoutonPrincipal enCours={enChangement}>{A.oubli.bouton}</BoutonPrincipal>
    </form>
  )
}
