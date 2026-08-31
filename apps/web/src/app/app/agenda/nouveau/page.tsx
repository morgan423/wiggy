import Link from 'next/link'
import { instantVersHeureLocale } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormRdv } from '../form'
import { creerRdv } from '../actions'

export default async function NouveauRdv() {
  await requirePro()
  const supabase = await supabaseServer()

  const [{ data: prestations }, { data: clientes }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_min')
      .eq('active', true)
      .order('position')
      .order('created_at'),
    supabase.from('clients').select('id, first_name, last_name').order('first_name'),
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
          clientes={clientes ?? []}
          valeurs={{ debut: instantVersHeureLocale(prochaineHeure) }}
          action={creerRdv}
          libelle="Enregistrer le rendez-vous"
        />
      </div>
    </>
  )
}
