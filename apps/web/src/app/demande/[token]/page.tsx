import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ZONE } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { canalDeRappel } from '@/lib/rappel'
import { WaitlistForm } from '@/app/recherche/waitlist-form'

/**
 * Suivi d'une demande de rendez-vous, par jeton.
 *
 * Une cliente n'a pas de compte : sans cette page, une demande refusée (A6) ou
 * validée n'a aucun chemin de retour vers elle tant que les SMS (B7) ne sont
 * pas là. Le lien lui est donné à l'envoi.
 *
 * Lecture en service role : `appointments` n'a aucune politique anonyme, et
 * cela ne changera pas. Le jeton est aléatoire, il ne donne accès qu'à cette
 * ligne, et la page n'expose ni le téléphone ni l'e-mail de qui que ce soit.
 * Elle n'est jamais indexée.
 */

const C = copy.reservationCliente

export const metadata: Metadata = { robots: { index: false } }

const quandFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SuiviDemande({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!supabaseConfigured() || !JETON.test(token)) notFound()

  const { data: rdv } = await supabaseAdmin()
    .from('appointments')
    .select('pro_id, starts_at, status, service_name, city, pros(display_name, slug)')
    .eq('public_token', token)
    .maybeSingle()
  if (!rdv) notFound()

  const relation: unknown = Array.isArray(rdv.pros) ? rdv.pros[0] : rdv.pros
  const fiche = (relation ?? {}) as { display_name?: string; slug?: string }
  const nomPro = fiche.display_name ?? ''
  const prenom = nomPro.split(' ')[0] ?? nomPro
  const quand = quandFr.format(new Date(rdv.starts_at))
  const canal = await canalDeRappel(rdv.pro_id)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {fiche.slug ? (
        <Link
          href={`/${fiche.slug}`}
          className="text-sm font-semibold text-texte-secondaire hover:text-action"
        >
          ← {nomPro}
        </Link>
      ) : null}

      {rdv.status === 'cancelled' ? (
        /* A6 : le refus est une porte, pas une impasse. Il enchaîne sur A9. */
        <>
          <h1 className="display mt-6 tracking-tight">
            {remplir(C.$aEcrire.demandeRefusee, { pro: prenom })}
          </h1>
          <p className="mt-6 text-lg">{C.aucunCreneau.invitation}</p>
          {rdv.city ? (
            <div className="mt-2">
              <WaitlistForm ville={rdv.city} />
            </div>
          ) : null}
        </>
      ) : rdv.status === 'pending' || rdv.status === 'conditional' ? (
        <>
          <h1 className="display mt-6 tracking-tight">
            {remplir(C.gabarits.demandeEnvoyee, { pro: prenom })}
          </h1>
          <p className="mt-6 text-lg">
            {remplir(
              canal === 'sms' ? C.rappel.demandeChezLaProSms : C.rappel.demandeChezLaProEmail,
              { pro: prenom },
            )}
          </p>
          <p className="mt-4 text-texte-secondaire">
            {rdv.service_name}, {quand}.
          </p>
          {rdv.status === 'conditional' ? (
            <p className="mt-6 rounded-carte bg-attente/25 px-5 py-4 font-semibold">
              {C.sousReserve.badge}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="display mt-6 tracking-tight">
            {remplir(C.gabarits.seDeplace, { pro: prenom })}
          </h1>
          <p className="mt-6 text-lg">
            {rdv.service_name}, {quand}.
          </p>
        </>
      )}
    </main>
  )
}
