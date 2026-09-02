import Link from 'next/link'
import type { Metadata } from 'next'
import { copy } from '@wiggy/copy'
import { PanneauAuth, PiedAuth } from '@/components/composition'
import { FormConnexion } from './form'

export const metadata: Metadata = { title: 'Se connecter', robots: { index: false } }

const A = copy.authentification

/**
 * Planche 14b, colonne « PRO · CONNEXION ». Le statement est ratifié :
 * « Te revoilà. » Il remplace « Content de te revoir. », qui avait en plus le
 * défaut d'accorder au masculin un genre que l'écran ne connaît pas encore.
 */
export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>
}) {
  const { suite } = await searchParams
  return (
    <PanneauAuth
      statement={A.connexion.titre}
      pied={
        <>
          <PiedAuth>
            <Link href="/mot-de-passe-oublie" className="font-extrabold underline">
              {A.connexion.oublie}
            </Link>
          </PiedAuth>
          <PiedAuth>
            {A.$aEcrire.pasDeCompte}{' '}
            <Link href="/inscription" className="font-extrabold underline">
              {A.$aEcrire.essai}
            </Link>
          </PiedAuth>
        </>
      }
    >
      <FormConnexion suite={suite} />
    </PanneauAuth>
  )
}
