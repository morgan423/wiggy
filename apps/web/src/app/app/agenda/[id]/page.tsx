import Link from 'next/link'
import { notFound } from 'next/navigation'
import { instantVersHeureLocale } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { photosDuRendezVous } from '@/lib/photos'
import { FormRdv } from '../form'
import { modifierRdv } from '../actions'

const T = copy.agendaTournee

export default async function ModifierRdv({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePro()
  const supabase = await supabaseServer()

  // La RLS fait le filtrage : un identifiant appartenant à un autre pro ne
  // renvoie simplement rien.
  const { data: rdv } = await supabase
    .from('appointments')
    .select(
      'id, client_id, service_id, service_name, price_cents, starts_at, ends_at, address_line1, postal_code, city, access_notes, note, status',
    )
    .eq('id', id)
    .maybeSingle()

  if (!rdv) notFound()

  const [{ data: prestations }, { data: clientes }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_min')
      .eq('active', true)
      .order('position'),
    supabase.from('clients').select('id, first_name, last_name').order('first_name'),
  ])

  // La lecture ci-dessus est passée par la RLS : si elle a renvoyé une ligne,
  // ce rendez-vous appartient bien au pro connecté. C'est cette preuve qui
  // autorise la signature des photos.
  const photos = await photosDuRendezVous(rdv.id)

  const dureeMin = Math.round(
    (new Date(rdv.ends_at).getTime() - new Date(rdv.starts_at).getTime()) / 60_000,
  )

  return (
    <>
      <Link
        href="/app/agenda"
        className="text-sm font-semibold text-texte-secondaire hover:text-action"
      >
        ← Agenda
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Modifier le rendez-vous</h1>

      {photos.length > 0 ? (
        <section className="mt-8 rounded-bloc bg-fond p-6">
          <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
            {T.$aEcrire.photosCliente}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {photos.map((photo) => (
              <li key={photo.url}>
                {/* Pas de `next/image` : ces URL sont signées et expirent, les
                    optimiser reviendrait à les mettre en cache après leur mort. */}
                <img
                  src={photo.url}
                  alt={photo.kind === 'current' ? 'Cheveux au naturel' : 'Inspiration'}
                  className="h-40 w-40 rounded-carte object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8">
        <FormRdv
          edition
          prestations={prestations ?? []}
          clientes={clientes ?? []}
          action={modifierRdv}
          libelle="Enregistrer les modifications"
          valeurs={{
            id: rdv.id,
            client_id: rdv.client_id,
            service_id: rdv.service_id,
            service_name: rdv.service_name,
            prix: (rdv.price_cents / 100).toFixed(2).replace('.', ','),
            duree: String(dureeMin),
            debut: instantVersHeureLocale(new Date(rdv.starts_at)),
            address_line1: rdv.address_line1,
            postal_code: rdv.postal_code,
            city: rdv.city,
            access_notes: rdv.access_notes,
            note: rdv.note,
          }}
        />
      </div>
    </>
  )
}
