import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauAuth } from '@/components/composition'
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
    <PanneauAuth
      statement={A.email.titre}
      sousTitre={`On vient d’écrire à ${data.user?.email ?? ''} : ouvre le lien pour vérifier ton adresse.`}
    >
      {/* Planche 14b : l'encart de progression est un bloc à 12 % sur le prune,
          pas un plein miel. Il rassure, il ne célèbre pas. */}
      <p className="mt-auto rounded-champ bg-texte-sur-plein/12 px-3.5 py-3 text-[12px] leading-[1.5]">
        {A.email.telephoneFait}
      </p>

      <Link
        href="/app/parametrage"
        className="tactile w-full rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol"
      >
        J’ai cliqué, continuer
      </Link>
      <form action={renvoyerEmail}>
        <button
          type="submit"
          className="tactile w-full text-[12px] font-extrabold text-texte-sur-plein-doux underline hover:text-texte-sur-plein"
        >
          {A.email.renvoyer}
        </button>
      </form>
    </PanneauAuth>
  )
}
