import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, RANGEE, EtatVide } from '@/components/composition'
import { FormHoraire } from './form'
import { supprimerPlage } from './actions'
import { JOURS } from './jours'

/**
 * Les journées de travail, planche 14f.
 *
 * La semaine s'ouvre sur SEPT PASTILLES de 38 px, une par jour, framboise quand
 * le jour est travaillé, sur la surface sinon. Puis une rangée qui résume :
 * les jours à gauche, la plage à droite. C'est cette ligne de pastilles qui dit
 * la semaine d'un coup d'œil, avant tout détail.
 *
 * ⚠️ Écart signalé : sur la planche, les pastilles se touchent pour régler un
 * jour seul. Ce geste demande une édition par jour qui n'existe pas encore
 * (les plages s'ajoutent et se suppriment). Les pastilles sont donc ici la
 * lecture de la semaine, et le réglage reste sous elles. Rien n'est inventé.
 */
export default async function Horaires() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: plages } = await supabase
    .from('working_hours')
    .select('id, weekday, starts_at, ends_at')
    .order('weekday')
    .order('starts_at')

  const liste = plages ?? []
  const parJour = JOURS.map((nom, index) => ({
    nom,
    index,
    plages: liste.filter((p) => p.weekday === index),
  }))
  const travailles = parJour.filter((j) => j.plages.length > 0)

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Tes journées de travail." />
      <CorpsEcran>
        <ul className="flex justify-between gap-[5px]">
          {parJour.map((jour) => {
            const actif = jour.plages.length > 0
            return (
              <li
                key={jour.nom}
                aria-label={`${jour.nom} : ${actif ? 'travaillé' : 'repos'}`}
                className={`flex size-[38px] items-center justify-center rounded-pilule text-[12px] font-extrabold ${
                  actif ? 'bg-action text-texte-sur-plein' : 'bg-surface'
                }`}
              >
                <span aria-hidden>{jour.nom.slice(0, 1)}</span>
              </li>
            )
          })}
        </ul>

        {travailles.length === 0 ? (
          <EtatVide invitation="Pose au moins une plage : sans horaires, ta page ne propose rien.">
            <FormHoraire premiere />
          </EtatVide>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {travailles.map((jour) => (
                <li key={jour.nom} className={RANGEE}>
                  <span className="text-[13px] font-bold">{jour.nom}</span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-2">
                    {jour.plages.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 text-[13px] font-bold">
                        {p.starts_at.slice(0, 5)} à {p.ends_at.slice(0, 5)}
                        <form action={supprimerPlage} className="flex">
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            aria-label={`Supprimer la plage de ${p.starts_at.slice(0, 5)} à ${p.ends_at.slice(0, 5)} le ${jour.nom.toLowerCase()}`}
                            className="text-[12px] text-texte-attenue hover:text-erreur"
                          >
                            ✕
                          </button>
                        </form>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] leading-[1.5] text-texte-attenue">
              Tu peux poser plusieurs plages par jour, par exemple matin et après-midi.
            </p>
            <FormHoraire />
          </>
        )}
      </CorpsEcran>
    </>
  )
}
