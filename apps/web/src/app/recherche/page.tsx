import Link from 'next/link'
import type { Metadata } from 'next'
import { citySearchTerm, normalizeCityName } from '@wiggy/core'
import { supabaseConfigured } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'
import { WaitlistForm } from './waitlist-form'

/**
 * A9 — recherche par ville, avec liste d'attente en repli.
 *
 * S7 : c'est la destination du CTA « Trouver une coiffeuse ». La promesse
 * client est tenue même sans annuaire — soit on montre des professionnels,
 * soit on capte la demande. Jamais une page de résultats vides.
 *
 * Registre : vouvoiement (S6), on s'adresse à la cliente finale.
 */

export const metadata: Metadata = {
  title: 'Trouver une coiffeuse ou un coiffeur à domicile',
  description:
    'Cherchez une coiffeuse ou un coiffeur à domicile dans votre ville. ' +
    'Si personne n’intervient encore près de chez vous, nous vous prévenons dès l’ouverture.',
}

type ProTrouve = {
  slug: string
  display_name: string
  city: string | null
  headline: string | null
}

async function chercherPros(terme: string): Promise<ProTrouve[]> {
  if (!supabaseConfigured() || !terme) return []
  // Client ordinaire, soumis à la RLS : cette page est publique, les
  // politiques `public_profile` et `public_area_communes` suffisent. Aucune
  // raison d'employer des droits élargis pour lire des fiches publiées.
  const supabase = await supabaseServer()

  // Deux requêtes plutôt qu'un `.or()` : PostgREST ne sait pas analyser une
  // condition `or` qui référence une colonne de table jointe — la première
  // version renvoyait PGRST100 et donc, silencieusement, aucun résultat.
  const [parVille, parCommune] = await Promise.all([
    supabase
      .from('pros')
      .select('slug, display_name, city, headline')
      .eq('published', true)
      .ilike('city', `%${terme}%`)
      .limit(20),
    // Le cas qui compte vraiment : la cliente habite une commune desservie,
    // même si le pro s'est déclaré basé ailleurs.
    supabase
      .from('service_area_communes')
      .select('pros!inner(slug, display_name, city, headline, published)')
      .ilike('name', `%${terme}%`)
      .eq('pros.published', true)
      .limit(20),
  ])

  if (parVille.error) console.error('recherche_par_ville_failed', parVille.error.code)
  if (parCommune.error) console.error('recherche_par_commune_failed', parCommune.error.code)

  const trouves = new Map<string, ProTrouve>()
  for (const pro of parVille.data ?? []) trouves.set(pro.slug, pro)
  for (const ligne of parCommune.data ?? []) {
    const pro = (Array.isArray(ligne.pros) ? ligne.pros[0] : ligne.pros) as ProTrouve | undefined
    // Un pro qui dessert plusieurs communes correspondantes ne doit apparaître
    // qu'une fois.
    if (pro) trouves.set(pro.slug, pro)
  }
  return [...trouves.values()]
}

export default async function Recherche({
  searchParams,
}: {
  searchParams: Promise<{ ville?: string }>
}) {
  const { ville: villeBrute } = await searchParams
  // La ville vient de l'URL. Elle est nettoyée UNE fois, et c'est cette valeur
  // qui sert à la fois au filtre PostgREST (dont la syntaxe est sensible aux
  // virgules et aux parenthèses) et à l'affichage — pour qu'on ne puisse pas
  // faire écrire n'importe quoi à la page via un lien.
  const ville = villeBrute ? citySearchTerm(normalizeCityName(villeBrute)) : ''
  const pros = ville ? await chercherPros(ville) : []

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm font-semibold text-texte-secondaire hover:text-action">
        ← Wiggy
      </Link>

      <h1 className="mt-8 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
        Une coiffeuse ou un coiffeur à domicile, chez vous.
      </h1>

      <form method="get" className="mt-10 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="ville" className="sr-only">
          Votre ville
        </label>
        <input
          id="ville"
          name="ville"
          defaultValue={ville}
          required
          autoComplete="address-level2"
          placeholder="Votre ville"
          className="w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
        />
        <button
          type="submit"
          className="rounded-pilule bg-action px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
        >
          Chercher
        </button>
      </form>

      {ville ? (
        pros.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight">
              {pros.length === 1
                ? `1 professionnel intervient à ${ville}`
                : `${pros.length} professionnels interviennent à ${ville}`}
            </h2>
            <ul className="mt-6 space-y-4">
              {pros.map((pro) => (
                <li key={pro.slug}>
                  <Link
                    href={`/${pro.slug}`}
                    className="block rounded-carte border-2 border-trait-discret p-6 hover:border-prune"
                  >
                    <span className="text-xl font-bold">{pro.display_name}</span>
                    {pro.headline ? (
                      <span className="mt-1 block text-texte-secondaire">{pro.headline}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="mt-14 rounded-carte bg-fond p-8 sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Personne ne se déplace encore à {ville}.
            </h2>
            <p className="mt-4 text-lg text-texte-secondaire">
              Laissez-nous votre e-mail : nous vous prévenons dès qu’un professionnel s’installe
              dans votre ville.
            </p>
            <WaitlistForm ville={ville} />
          </section>
        )
      ) : null}
    </main>
  )
}
