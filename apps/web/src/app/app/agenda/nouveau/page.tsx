import Link from 'next/link'
import { instantVersHeureLocale } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormRdv } from '../form'
import { creerRdv } from '../actions'

export default async function NouveauRdv({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const { cliente } = await searchParams
  await requirePro()
  const supabase = await supabaseServer()

  const [{ data: prestations }, { data: clientes }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_min')
      .eq('active', true)
      .order('position')
      .order('created_at'),
    supabase
      .from('clients')
      .select('id, first_name, last_name, technical_notes')
      .order('first_name'),
  ])

  // Par défaut : la prochaine heure ronde, l'heure de Paris faisant foi.
  const prochaineHeure = new Date()
  prochaineHeure.setMinutes(0, 0, 0)
  prochaineHeure.setHours(prochaineHeure.getHours() + 1)

  return (
    <>
      <Link
        href="/app/agenda"
        className="text-sm font-semibold text-texte-secondaire hover:text-action"
      >
        ← Agenda
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Ajouter un rendez-vous</h1>
      <p className="mt-3 text-texte-secondaire">
        Pour les rendez-vous pris par téléphone, SMS ou Instagram. Ils comptent comme les autres
        dans ta tournée.
      </p>

      <div className="mt-8">
        <FormRdv
          prestations={prestations ?? []}
          clientes={await avecDerniereAdresse(supabase, clientes ?? [])}
          clientePreChoisie={cliente ?? null}
          valeurs={{ debut: instantVersHeureLocale(prochaineHeure) }}
          action={creerRdv}
          libelle="Enregistrer le rendez-vous"
        />
      </div>
    </>
  )
}

/**
 * Dernière adresse connue de chaque cliente, reprise de son rendez-vous le
 * plus récent.
 *
 * `client_addresses` reste vide en pratique : la réservation en ligne pose
 * l'adresse sur le rendez-vous, pas sur la fiche. C'est donc l'historique qui
 * fait référence, et c'est lui qui rend l'adresse obligatoire indolore pour
 * une cliente déjà venue (R2-7 bis ②).
 */
async function avecDerniereAdresse(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  clientes: {
    id: string
    first_name: string
    last_name: string | null
    technical_notes: string | null
  }[],
) {
  if (clientes.length === 0) return []
  const { data: historique } = await supabase
    .from('appointments')
    .select('client_id, address_line1, postal_code, city, starts_at')
    .not('address_line1', 'is', null)
    .order('starts_at', { ascending: false })

  const derniere = new Map<
    string,
    { address_line1: string | null; postal_code: string | null; city: string | null }
  >()
  for (const rdv of historique ?? []) {
    if (rdv.client_id && !derniere.has(rdv.client_id)) {
      derniere.set(rdv.client_id, {
        address_line1: rdv.address_line1,
        postal_code: rdv.postal_code,
        city: rdv.city,
      })
    }
  }
  return clientes.map((c) => ({ ...c, adresse: derniere.get(c.id) }))
}
