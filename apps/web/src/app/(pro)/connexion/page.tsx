import Link from 'next/link'
import type { Metadata } from 'next'
import { FormConnexion } from './form'

export const metadata: Metadata = { title: 'Se connecter', robots: { index: false } }

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>
}) {
  const { suite } = await searchParams
  return (
    <>
      <h1 className="mt-8 text-4xl font-extrabold tracking-tight">Content de te revoir.</h1>
      <FormConnexion suite={suite} />
      <p className="mt-8 text-texte-secondaire">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-semibold text-action hover:underline">
          Essaie 30 jours
        </Link>
      </p>
    </>
  )
}
