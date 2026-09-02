import { formatEuros } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauPlein, CarteCreme } from '@/components/composition'
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
      <PanneauPlein
        statement="Ce que tu proposes."
        chiffre={(prestations ?? []).length > 0 ? String((prestations ?? []).length) : undefined}
        legende={
          (prestations ?? []).length > 0
            ? `prestation${(prestations ?? []).length > 1 ? 's' : ''} visibles par tes clientes`
            : 'Une prestation, c’est un nom, un prix et une durée. C’est ce que ta cliente choisit en premier.'
        }
      >
        <CarteCreme>
          {prestations && prestations.length > 0 ? (
            <ul className="space-y-3">
              {prestations.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-carte bg-surface p-5"
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
            <p className="rounded-carte bg-surface p-6 text-texte-secondaire">
              Aucune prestation pour l’instant. Ajoute la première ci-dessous.
            </p>
          )}

          <div className="mt-8 border-t border-trait-discret pt-6">
            <h2 className="text-xl font-bold tracking-tight">Ajouter une prestation</h2>
            <FormPrestation />
          </div>
        </CarteCreme>
      </PanneauPlein>
    </>
  )
}
