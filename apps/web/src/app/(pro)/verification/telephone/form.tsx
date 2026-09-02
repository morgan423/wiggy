'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { copy, remplir } from '@wiggy/copy'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'
import { envoyerCodeTelephone, controlerCodeTelephone, type EtatVerif } from '../actions'

const A = copy.authentification

/** Le compte à rebours du renvoi, comme sur la planche 14b. */
const DELAI_RENVOI_S = 45

/**
 * D9, planche 14b : la vérification du téléphone du pro.
 *
 * Deux temps sur un seul écran : le numéro, puis le code. Le code se vérifie
 * automatiquement au cinquième chiffre, la spécification est explicite.
 */
export function FormTelephone({ numeroConnu }: { numeroConnu: string }) {
  const router = useRouter()
  const [envoi, actionEnvoi] = useActionState<EtatVerif, FormData>(envoyerCodeTelephone, {
    statut: 'vide',
  })
  const [controle, actionControle, enControle] = useActionState<EtatVerif, FormData>(
    controlerCodeTelephone,
    { statut: 'vide' },
  )
  const [attente, setAttente] = useState(0)

  useEffect(() => {
    if (envoi.statut === 'envoye') setAttente(DELAI_RENVOI_S)
  }, [envoi.statut, envoi])

  useEffect(() => {
    if (attente <= 0) return
    const t = setTimeout(() => {
      setAttente(attente - 1)
    }, 1000)
    return () => {
      clearTimeout(t)
    }
  }, [attente])

  useEffect(() => {
    if (controle.statut === 'verifie') router.push('/verification/email')
  }, [controle.statut, router])

  if (envoi.statut !== 'envoye') {
    return (
      <form action={actionEnvoi}>
        {/* Piège anti-robot : invisible, hors tabulation, ignoré des lecteurs
            d'écran. Une personne ne peut pas le remplir, un robot le complète. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden">
          <label htmlFor="site_web">Ne pas remplir</label>
          <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <Champ
          id="telephone"
          label={A.$aEcrire.telephoneChamp}
          type="tel"
          autoComplete="tel"
          defaultValue={envoi.statut === 'erreur' ? (envoi.saisie ?? numeroConnu) : numeroConnu}
          fautif={envoi.statut === 'erreur'}
        />
        <Erreur message={envoi.statut === 'erreur' ? envoi.message : undefined} />
        <BoutonPrincipal enCours={false}>{A.$aEcrire.telephoneBouton}</BoutonPrincipal>
      </form>
    )
  }

  return (
    <>
      <p className="mt-4 text-texte-sur-plein-doux">
        {remplir(A.gabarits.codeEnvoye, { numero: envoi.numero })}
      </p>
      {envoi.codeDeDeveloppement ? (
        <p className="mt-3 rounded-carte bg-attente px-5 py-3 font-bold text-texte-sur-miel">
          {remplir(A.$aEcrire.codeDeveloppement, { code: envoi.codeDeDeveloppement })}
        </p>
      ) : null}

      <form action={actionControle}>
        <input type="hidden" name="numero" value={envoi.numero} />
        <Champ
          id="code"
          label="Le code reçu"
          inputMode="numeric"
          autoComplete="one-time-code"
          fautif={controle.statut === 'erreur'}
        />
        <Erreur message={controle.statut === 'erreur' ? controle.message : undefined} />
        <BoutonPrincipal enCours={enControle}>Vérifier</BoutonPrincipal>
      </form>

      <p className="mt-5 text-texte-sur-plein-doux">
        {A.telephone.rienRecu}{' '}
        {attente > 0 ? (
          <span className="font-semibold">
            {remplir(A.$aEcrire.gabaritRenvoyer, { secondes: String(attente) })}
          </span>
        ) : (
          <button
            type="submit"
            form="renvoi"
            className="tactile font-bold text-celebration underline"
          >
            {A.telephone.renvoyer}
          </button>
        )}
      </p>
      <form id="renvoi" action={actionEnvoi} className="hidden">
        <input type="hidden" name="telephone" value={envoi.numero} />
      </form>
    </>
  )
}
