import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, EtatVide, RANGEE } from '@/components/composition'
import { FormConge } from './form'
import { supprimerConge } from './actions'

const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

/**
 * Les congés, planche 14f, statement révisé : « Bientôt en vacances ? »
 *
 * Vide, l'écran ne constate rien : il invite, au centre, avec l'action
 * principale sous la phrase. Rempli, chaque congé est une rangée d'une seule
 * ligne, et l'ajout redevient un bouton en pointillés.
 *
 * ⚠️ Écart signalé : la planche montre en plus une carte abricot de conflit
 * (« 2 rendez-vous tombent dans ces dates »), avec ses deux choix. La détection
 * de conflit n'existe pas encore, et aucun SMS ne part sans validation : cette
 * carte se construira avec la fonctionnalité, pas avant elle.
 */
export default async function Conges() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: conges } = await supabase
    .from('time_off')
    .select('id, starts_at, ends_at, label')
    .order('starts_at')

  const liste = conges ?? []

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Bientôt en vacances ?" />
      <CorpsEcran>
        {liste.length === 0 ? (
          <EtatVide invitation="Aucun congé posé. Pose-les tôt : tes clientes réservent autour, personne n’annule.">
            <FormConge premier />
          </EtatVide>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {liste.map((c) => (
                <li key={c.id} className={`${RANGEE} ${c.label ? 'items-start' : ''}`}>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="text-[13px] font-bold">
                      Du {jour.format(new Date(c.starts_at))} au {jour.format(new Date(c.ends_at))}
                    </span>
                    {c.label ? (
                      <span className="text-[11.5px] text-texte-attenue">{c.label}</span>
                    ) : null}
                  </span>
                  <form action={supprimerConge} className="shrink-0">
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="text-[12px] font-bold text-action hover:text-action-survol"
                    >
                      Supprimer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <FormConge />
          </>
        )}
      </CorpsEcran>
    </>
  )
}
