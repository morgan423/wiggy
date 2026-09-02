import type { Metadata } from 'next'
import { copy, remplir } from '@wiggy/copy'
import { PanneauPlein } from '@/components/composition'
import { FormOubli } from './form'

export const metadata: Metadata = { robots: { index: false } }

const A = copy.authentification

/**
 * D9, planche 14b : « On te rouvre la porte. »
 *
 * Le code part sur le téléphone vérifié, jamais un lien par e-mail : une boîte
 * compromise ne doit pas suffire à prendre un compte. Sans téléphone vérifié
 * accessible, le seul chemin est le support, jamais un contournement
 * automatique.
 */
export default function MotDePasseOublie() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <PanneauPlein
        statement={A.oubli.titre}
        legende={remplir(A.gabarits.codeParTelephone, { numero: 'celui de ton compte' })}
      >
        <FormOubli />
        <p className="mt-6 text-texte-sur-plein-doux">
          {A.$aEcrire.plusCeNumero} : écris-nous, aucun contournement automatique n’existe.
        </p>
      </PanneauPlein>
    </main>
  )
}
