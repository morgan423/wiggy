import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ZONE, formatEuros } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { FormReponse } from './form'

/**
 * A11 ④ — la cliente reçoit la contre-proposition et répond. Planche 17b.
 *
 * **Lien sans compte**, comme le suivi d'un rendez-vous : la cliente n'a pas de
 * compte et n'en aura pas. Le jeton ouvre CETTE proposition et rien d'autre, et
 * la lecture passe par le serveur : un jeton dans une URL n'est pas une
 * authentification, et il ne doit jamais ouvrir une table entière.
 *
 * **Le rendez-vous n'est confirmé qu'après son accord.** C'est la phrase que
 * l'écran répète, parce que c'est elle qui rend l'ajustement acceptable :
 * « rien n'est réservé tant que vous n'avez pas accepté ».
 *
 * Registre : vouvoiement chaleureux.
 */

export const metadata: Metadata = { robots: { index: false } }

const D = copy.demandesPro
const C = copy.reservationCliente

const quand = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function Proposition({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!supabaseConfigured()) notFound()

  // Droits élargis, à dessein : la table n'a aucune politique anonyme, et c'est
  // très bien ainsi. Ce qui sort d'ici est UNE proposition, celle du jeton.
  const admin = supabaseAdmin()
  const { data: proposition } = await admin
    .from('propositions')
    .select('id, status, service_name, price_cents, duration_min, message, appointment_id, pro_id')
    .eq('public_token', token)
    .maybeSingle()
  if (!proposition) notFound()

  const [{ data: rdv }, { data: pro }] = await Promise.all([
    admin
      .from('appointments')
      .select('service_name, price_cents, starts_at, ends_at')
      .eq('id', proposition.appointment_id)
      .maybeSingle(),
    admin.from('pros').select('display_name').eq('id', proposition.pro_id).maybeSingle(),
  ])
  if (!rdv || !pro) notFound()

  const prenom = pro.display_name.split(' ')[0] ?? pro.display_name
  const dureeInitiale = Math.round(
    (new Date(rdv.ends_at).getTime() - new Date(rdv.starts_at).getTime()) / 60_000,
  )

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="display tracking-tight">
        {remplir(D.gabarits.propositionTitre, { pro: prenom })}
      </h1>

      {proposition.status !== 'en_attente' ? (
        <p className="mt-8 rounded-carte bg-fond p-6 text-lg">
          {proposition.status === 'acceptee'
            ? C.$aEcrire.propositionDejaAcceptee
            : C.$aEcrire.propositionClose}
        </p>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              {D.proposition.votreDemande}
            </h2>
            <p className="mt-2 text-lg">
              {rdv.service_name} · {String(dureeInitiale)} min · {formatEuros(rdv.price_cents)}
            </p>
            <p className="mt-1 text-texte-secondaire">{quand.format(new Date(rdv.starts_at))}</p>
          </section>

          <section className="mt-8 rounded-carte bg-surface p-6">
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              {remplir(D.gabarits.propositionDe, { pro: prenom })}
            </h2>
            <p className="mt-2 text-lg font-bold">
              {proposition.service_name ?? rdv.service_name} ·{' '}
              {String(proposition.duration_min ?? dureeInitiale)} min ·{' '}
              {formatEuros(proposition.price_cents ?? rdv.price_cents)}
            </p>
            {proposition.message ? (
              <p className="mt-4 leading-relaxed">{proposition.message}</p>
            ) : null}
          </section>

          <FormReponse token={token} />

          <p className="mt-4 text-center text-texte-secondaire">{D.proposition.rienReserve}</p>
        </>
      )}
    </main>
  )
}
