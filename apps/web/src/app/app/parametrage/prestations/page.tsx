import { formatEuros } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, EtatVide, RANGEE } from '@/components/composition'
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
      <CorpsEcran serre>
        {liste.length === 0 ? (
          <EtatVide
            titre="Ta liste est vide."
            invitation="Ajoute ta première prestation : deux minutes suffisent, tu pourras tout retoucher."
          >
            <FormPrestation premiere />
          </EtatVide>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {liste.map((p) => (
                <li key={p.id} className={`${RANGEE} items-start ${p.active ? '' : 'opacity-55'}`}>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="text-[13.5px] leading-[1.35] font-bold">{p.name}</span>
                    <span className="text-[11.5px] text-texte-attenue">{meta(p)}</span>
                    {/*
                      Écart signalé : la planche 14d fait passer l'édition par
                      une feuille montante, qui n'est pas construite. Masquer et
                      supprimer restent donc dans la rangée, en petit, sous le
                      détail. Rien d'inventé ailleurs.
                    */}
                    <span className="mt-1.5 flex gap-3 text-[11.5px] font-bold">
                      <form action={basculerPrestation}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={String(p.active)} />
                        <button type="submit" className="text-texte-attenue hover:text-prune">
                          {p.active ? 'Masquer' : 'Réafficher'}
                        </button>
                      </form>
                      <form action={supprimerPrestation}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-texte-attenue hover:text-erreur">
                          Supprimer
                        </button>
                      </form>
                    </span>
                  </span>
                  {/* Le prix est hors du bloc de texte : il ne descend jamais à
                      la ligne, même sur un libellé de deux lignes. */}
                  <span className="prix shrink-0">{formatEuros(p.price_cents)}</span>
                </li>
              ))}
            </ul>
            <FormPrestation />
          </>
        )}
      </CorpsEcran>
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
