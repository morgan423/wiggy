import { formatEuros } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormPrestation } from './form'
import { basculerPrestation, supprimerPrestation } from './actions'

export default async function Prestations() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: prestations } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_min, deposit_percent, active')
    .order('position')
    .order('created_at')

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tes prestations</h1>
      <p className="mt-3 text-texte-secondaire">
        Nom, prix et durée de base. La durée s’affinera toute seule avec tes rendez-vous réels : tu
        n’auras pas à la corriger à la main.
      </p>

      {prestations && prestations.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {prestations.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-carte border-2 border-trait-discret p-5"
            >
              <span
                className={`text-lg font-bold ${p.active ? '' : 'text-texte-secondaire line-through'}`}
              >
                {p.name}
              </span>
              <span className="text-texte-secondaire">
                {formatEuros(p.price_cents)} · {p.duration_min} min
                {p.deposit_percent ? ` · acompte ${p.deposit_percent} %` : ''}
              </span>

              <div className="ml-auto flex gap-3 text-sm font-semibold">
                <form action={basculerPrestation}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(p.active)} />
                  <button type="submit" className="text-texte-secondaire hover:text-prune">
                    {p.active ? 'Masquer' : 'Réafficher'}
                  </button>
                </form>
                <form action={supprimerPrestation}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-texte-secondaire hover:text-erreur">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-carte bg-fond p-6 text-texte-secondaire">
          Aucune prestation pour l’instant. Ajoute la première ci-dessous.
        </p>
      )}

      <section className="mt-12 border-t border-trait-discret pt-8">
        <h2 className="text-xl font-bold tracking-tight">Ajouter une prestation</h2>
        <FormPrestation />
      </section>
    </>
  )
}
