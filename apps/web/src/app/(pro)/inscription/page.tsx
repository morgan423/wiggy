import Link from 'next/link'
import type { Metadata } from 'next'
import { FormInscription } from './form'

export const metadata: Metadata = { title: 'Créer mon compte', robots: { index: false } }

export default function Inscription() {
  return (
    <>
      <h1 className="mt-8 text-4xl font-extrabold tracking-tight">
        Ta tournée s’organise toute seule.
      </h1>
      <p className="mt-4 text-lg text-texte-secondaire">
        30 jours d’essai. Résiliation en deux taps, quand tu veux.
      </p>
      <FormInscription />
      <p className="mt-8 text-texte-secondaire">
        Déjà un compte ?{' '}
        <Link href="/connexion" className="font-semibold text-action hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  )
}
