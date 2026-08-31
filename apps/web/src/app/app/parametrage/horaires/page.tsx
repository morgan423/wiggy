import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormHoraire } from './form'
import { supprimerPlage } from './actions'
import { JOURS } from './jours'

export default async function Horaires() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: plages } = await supabase
    .from('working_hours')
    .select('id, weekday, starts_at, ends_at')
    .order('weekday')
    .order('starts_at')

  const parJour = JOURS.map((nom, index) => ({
    nom,
    plages: (plages ?? []).filter((p) => p.weekday === index),
  }))

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tes horaires</h1>
      <p className="mt-3 text-texte-secondaire">
        Tes journées de travail habituelles. Tu pourras toujours bloquer un créneau ponctuellement,
        ou poser des congés : ceci n’est que la trame.
      </p>

      <ul className="mt-8 space-y-2">
        {parJour.map((jour) => (
          <li
            key={jour.nom}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-carte border-2 border-trait-discret px-5 py-4"
          >
            <span className="w-24 font-bold">{jour.nom}</span>
            {jour.plages.length === 0 ? (
              <span className="text-texte-secondaire">Repos</span>
            ) : (
              jour.plages.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-2 rounded-pilule bg-fond px-4 py-1"
                >
                  {p.starts_at.slice(0, 5)} à {p.ends_at.slice(0, 5)}
                  <form action={supprimerPlage}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      aria-label={`Supprimer la plage de ${p.starts_at.slice(0, 5)} à ${p.ends_at.slice(0, 5)} le ${jour.nom.toLowerCase()}`}
                      className="font-bold text-texte-secondaire hover:text-erreur"
                    >
                      ×
                    </button>
                  </form>
                </span>
              ))
            )}
          </li>
        ))}
      </ul>

      <section className="mt-12 border-t border-trait-discret pt-8">
        <h2 className="text-xl font-bold tracking-tight">Ajouter une plage</h2>
        <p className="mt-2 text-sm text-texte-secondaire">
          Tu peux en poser plusieurs par jour, par exemple matin et après-midi.
        </p>
        <FormHoraire />
      </section>
    </>
  )
}
