import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran } from '@/components/composition'
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

  // Jours réellement bloqués, bornes comprises : c'est ce que la cliente ne
  // pourra pas réserver, pas un nombre d'entrées dans une liste.
  const joursPoses = (conges ?? []).reduce((total, c) => {
    const jours = Math.round(
      (new Date(c.ends_at).getTime() - new Date(c.starts_at).getTime()) / 86_400_000,
    )
    return total + Math.max(1, jours)
  }, 0)

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        statement="Bientôt en vacances ?"
        sousTitre={
          joursPoses > 0
            ? `${String(joursPoses)} jour${joursPoses > 1 ? 's' : ''} posés. Aucune cliente ne peut réserver dessus.`
            : 'Pose-les tôt : tes clientes réservent autour, personne n’annule.'
        }
      />
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
