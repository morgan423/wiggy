import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { chercherCommunes } from '@/lib/communes'
import { ajouterCommune, retirerCommune } from './actions'

export default async function Zone({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePro()
  const { q } = await searchParams
  const supabase = await supabaseServer()

  const { data: choisies } = await supabase
    .from('service_area_communes')
    .select('insee_code, name, postal_code')
    .order('name')

  const resultats = q ? await chercherCommunes(q) : []
  const dejaChoisie = new Set((choisies ?? []).map((c) => c.insee_code))

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Ta zone d’intervention</h1>
      <p className="mt-3 text-texte-secondaire">
        Les communes où tu te déplaces. C’est ce qui permet de ne proposer à tes clientes que des
        créneaux cohérents avec ta tournée.
      </p>

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

        <form method="get" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Nom de la commune
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Pau, Lescar, Billère…"
            className="w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
          />
          <button
            type="submit"
            className="rounded-pilule bg-prune px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-prune-survol"
          >
            Chercher
          </button>
        </form>

        {q ? <Resultats resultats={resultats} dejaChoisie={dejaChoisie} /> : null}
      </section>
    </>
  )
}

function Resultats({
  resultats,
  dejaChoisie,
}: {
  resultats: Awaited<ReturnType<typeof chercherCommunes>>
  dejaChoisie: Set<string>
}) {
  // null = service injoignable, [] = aucune commune de ce nom. Les deux ne se
  // disent pas pareil au pro.
  if (resultats === null) {
    return (
      <p role="alert" className="mt-6 font-semibold text-erreur">
        Le service des communes ne répond pas. Réessaie dans un instant.
      </p>
    )
  }
  if (resultats.length === 0) {
    return <p className="mt-6 text-texte-secondaire">Aucune commune de ce nom.</p>
  }

  return (
    <ul className="mt-6 space-y-2">
      {resultats.map((c) => (
        <li
          key={c.insee_code}
          className="flex items-center gap-4 rounded-carte border-2 border-trait-discret px-5 py-4"
        >
          <span className="font-semibold">{c.name}</span>
          {c.postal_code ? <span className="text-texte-secondaire">{c.postal_code}</span> : null}
          <div className="ml-auto">
            {dejaChoisie.has(c.insee_code) ? (
              <span className="text-sm font-semibold text-texte-secondaire">Déjà dans ta zone</span>
            ) : (
              <form action={ajouterCommune}>
                <input type="hidden" name="insee_code" value={c.insee_code} />
                <input type="hidden" name="name" value={c.name} />
                <input type="hidden" name="postal_code" value={c.postal_code ?? ''} />
                <input type="hidden" name="lat" value={c.lat ?? ''} />
                <input type="hidden" name="lng" value={c.lng ?? ''} />
                <button type="submit" className="text-sm font-bold text-action hover:underline">
                  Ajouter
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
