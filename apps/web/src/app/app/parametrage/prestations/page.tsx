import { formatEuros } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CarteEcran, EtatVide } from '@/components/composition'
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

  const liste = prestations ?? []

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Ce que tu proposes." />

      {liste.length === 0 ? (
        <EtatVide
          titre="Ta liste est vide."
          invitation="Ajoute ta première prestation : deux minutes suffisent, tu pourras tout retoucher."
        >
          <FormPrestation premiere />
        </EtatVide>
      ) : (
        <ul className="mt-4">
          {liste.map((p) => (
            <li key={p.id}>
              {/* Le prix est hors du bloc de texte : il ne descend jamais à la
                  ligne, même sur un libellé de deux lignes (planche 14d). */}
              <CarteEcran
                principal={p.name}
                secondaire={meta(p)}
                valeur={formatEuros(p.price_cents)}
                attenue={!p.active}
              >
                <span className="mt-2 flex gap-4 text-sm font-semibold">
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
                </span>
              </CarteEcran>
            </li>
          ))}
        </ul>
      )}

      {liste.length > 0 ? (
        <section className="mt-4">
          <FormPrestation />
        </section>
      ) : null}
    </>
  )
}

/** « 45 min · visible » ou « 1 h 30 · acompte 30 % », comme la planche 14d. */
function meta(p: {
  duration_min: number
  deposit_percent: number | null
  active: boolean
}): string {
  const morceaux = [duree(p.duration_min)]
  if (p.deposit_percent) morceaux.push(`acompte ${String(p.deposit_percent)} %`)
  morceaux.push(p.active ? 'visible' : 'masquée de ta page')
  return morceaux.join(' · ')
}

/** « 45 min », « 1 h 30 » : la planche écrit les longues durées en heures. */
function duree(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m).padStart(2, '0')}`
}
