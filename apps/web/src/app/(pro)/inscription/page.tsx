import Link from 'next/link'
import type { Metadata } from 'next'
import { copy } from '@wiggy/copy'
import { PanneauAuth, PiedAuth } from '@/components/composition'
import { FormInscription } from './form'

export const metadata: Metadata = { title: 'Créer mon compte', robots: { index: false } }

const A = copy.authentification

/**
 * Planche 14b, colonne « PRO · INSCRIPTION ». Statement et sous-titre ratifiés,
 * repris du copy deck : « Bienvenue chez Wiggy. »
 */
export default function Inscription() {
  return (
    <PanneauAuth
      statement={A.inscription.titre}
      sousTitre={A.inscription.sousTitre}
      pied={
        <PiedAuth>
          {A.inscription.dejaInscrit}{' '}
          <Link href="/connexion" className="font-extrabold underline">
            {A.inscription.seConnecter}
          </Link>
        </PiedAuth>
      }
    >
      <FormInscription />
    </PanneauAuth>
  )
}
