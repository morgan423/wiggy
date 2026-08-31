import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormConge } from './form'
import { supprimerConge } from './actions'

const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function Conges() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: conges } = await supabase
    .from('time_off')
    .select('id, starts_at, ends_at, label')
    .order('starts_at')

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tes congés</h1>
      <p className="mt-3 text-texte-secondaire">
        Les périodes où tu ne travailles pas. Aucun créneau n’y sera proposé à tes clientes.
      </p>

      {conges && conges.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {conges.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-5 rounded-carte border-2 border-trait-discret p-5"
            >
              <div>
                <p className="text-lg font-bold">
                  Du {jour.format(new Date(c.starts_at))} au {jour.format(new Date(c.ends_at))}
                </p>
                {c.label ? <p className="text-texte-secondaire">{c.label}</p> : null}
              </div>
              <form action={supprimerConge} className="ml-auto">
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="text-sm font-semibold text-texte-secondaire hover:text-erreur"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-carte bg-fond p-6 text-texte-secondaire">Aucun congé posé.</p>
      )}

      <section className="mt-12 border-t border-trait-discret pt-8">
        <h2 className="text-xl font-bold tracking-tight">Poser un congé</h2>
        <FormConge />
      </section>
    </>
  )
}
