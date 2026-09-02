import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauPlein } from '@/components/composition'
import { renvoyerEmail } from '../actions'

export const metadata: Metadata = { robots: { index: false } }

const A = copy.authentification

/**
 * D9, planche 14b : « Un clic dans ta boîte mail. »
 *
 * La vérification se constate au retour dans l'app : c'est le lien reçu qui la
 * produit, pas cet écran. Tant qu'elle manque, la rangée d'invite reste dans le
 * hub et la mise en ligne de la page est désactivée.
 */
export default async function VerifierEmail() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data } = await supabase.auth.getUser()
  if (data.user?.email_confirmed_at) redirect('/app/parametrage')

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <PanneauPlein
        statement={A.email.titre}
        legende={`On vient d’écrire à ${data.user?.email ?? ''} : ouvre le lien pour vérifier ton adresse.`}
      >
        <p className="mt-2 rounded-carte bg-celebration px-5 py-4 font-bold text-texte-sur-miel">
          {A.email.telephoneFait}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/app/parametrage"
            className="tactile w-full justify-center rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol"
          >
            J’ai cliqué, continuer
          </Link>
          <form action={renvoyerEmail}>
            <button
              type="submit"
              className="tactile w-full justify-center rounded-pilule border-2 border-texte-sur-plein px-8 font-bold"
            >
              {A.email.renvoyer}
            </button>
          </form>
        </div>
      </PanneauPlein>
    </main>
  )
}
