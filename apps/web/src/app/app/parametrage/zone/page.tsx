import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauPlein, CarteCreme } from '@/components/composition'
import { RechercheCommune } from './recherche'
import { retirerCommune } from './actions'

export default async function Zone() {
  await requirePro()
  const supabase = await supabaseServer()

  const { data: choisies } = await supabase
    .from('service_area_communes')
    .select('insee_code, name, postal_code')
    .order('name')

  const dejaChoisies = (choisies ?? []).map((c) => c.insee_code)

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
        </CarteCreme>
      </PanneauPlein>
    </>
  )
}
