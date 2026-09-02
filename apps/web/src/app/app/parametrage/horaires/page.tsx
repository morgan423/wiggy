import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran } from '@/components/composition'
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

  // Le chiffre que le réglage produit, calculé sur les plages réelles.
  const heuresParSemaine = (plages ?? []).reduce((total, h) => {
    const minutes = enMinutes(h.ends_at) - enMinutes(h.starts_at)
    return total + Math.max(0, minutes)
  }, 0)

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        statement="Tes journées de travail."
        chiffre={heuresParSemaine > 0 ? formatHeures(heuresParSemaine) : undefined}
        sousTitre={
          heuresParSemaine > 0
            ? 'par semaine, à distribuer entre tes clientes'
            : 'Pose au moins une plage : sans horaires, ta page ne propose rien.'
        }
      />
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

const enMinutes = (heure: string) => {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

/** « 38 h » ou « 38 h 30 ». Jamais « 38.5 h » : personne ne lit ses horaires ainsi. */
function formatHeures(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
