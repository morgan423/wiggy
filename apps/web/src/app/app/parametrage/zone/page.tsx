import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauPlein, CarteCreme } from '@/components/composition'
import { formatEuros } from '@wiggy/core'
import { RechercheCommune } from './recherche'
import { FormForfait } from './forfait'
import { retirerCommune } from './actions'

export default async function Zone() {
  await requirePro()
  const supabase = await supabaseServer()

  const { data: choisies } = await supabase
    .from('service_area_communes')
    .select('insee_code, name, postal_code')
    .order('name')

  const dejaChoisies = (choisies ?? []).map((c) => c.insee_code)

  // A8 : le forfait de base vit sur la ligne `from_km = 0`.
  const { data: forfait } = await supabase
    .from('distance_fees')
    .select('fee_cents')
    .eq('from_km', 0)
    .maybeSingle()

  return (
    <>
      <PanneauPlein
        statement="Où tu te déplaces."
        chiffre={dejaChoisies.length > 0 ? String(dejaChoisies.length) : undefined}
        legende={
          dejaChoisies.length > 0
            ? `commune${dejaChoisies.length > 1 ? 's' : ''} desservies. Une adresse ailleurs passe en demande sous réserve.`
            : 'Sans zone, aucun créneau ne peut être proposé : c’est elle qui nourrit le moteur de tournée.'
        }
      >
        <CarteCreme>
          {choisies && choisies.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-3">
              {choisies.map((c) => (
                <li key={c.insee_code}>
                  <span className="flex items-center gap-3 rounded-pilule bg-fond px-5 py-2 font-semibold">
                    {c.name}
                    {c.postal_code ? (
                      <span className="text-texte-secondaire">{c.postal_code}</span>
                    ) : null}
                    <form action={retirerCommune}>
                      <input type="hidden" name="insee_code" value={c.insee_code} />
                      <button
                        type="submit"
                        aria-label={`Retirer ${c.name} de ta zone`}
                        className="font-bold text-texte-secondaire hover:text-erreur"
                      >
                        ×
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-carte bg-fond p-6 text-texte-secondaire">
              Aucune commune pour l’instant. Cherche la tienne ci-dessous.
            </p>
          )}

          <section className="mt-12 border-t border-trait-discret pt-8">
            <h2 className="text-xl font-bold tracking-tight">Ajouter une commune</h2>
            <RechercheCommune dejaChoisies={dejaChoisies} />
          </section>

          <section className="mt-8 border-t border-trait-discret pt-6">
            <h2 className="text-xl font-bold tracking-tight">Au-delà de ta zone</h2>
            <p className="mt-2 text-texte-secondaire">
              Une adresse hors zone n’est pas refusée : elle devient une demande sous réserve, que
              tu valides.
            </p>
            <FormForfait
              montant={forfait ? formatEuros(forfait.fee_cents).replace(/\s*€/, '') : ''}
            />
          </section>
        </CarteCreme>
      </PanneauPlein>
    </>
  )
}
