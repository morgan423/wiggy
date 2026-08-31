import { citySearchTerm, type Commune } from '@wiggy/core'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * D6 : le référentiel des communes se lit en base, plus sur le réseau.
 *
 * Il vient de l'API Découpage administratif de l'État, mais par un import
 * périodique (`npm run communes:import`), jamais par un appel à l'exécution.
 * Composer sa zone d'intervention ne dépend donc plus de la disponibilité d'un
 * service tiers : un hoquet de cinq secondes laissait la pro sans aucun moyen
 * de la renseigner, alors que A3, A5, A6 et A8 en dépendent tous.
 *
 * La lecture passe par le client soumis à la RLS : la table est publique en
 * lecture, et c'est justifié par écrit dans `docs/matrice-acces.md`.
 */

/** Assez pour lever une ambiguïté, trop peu pour noyer. */
const MAX_RESULTATS = 12

/**
 * Renvoie null si la base elle-même n'a pas répondu, à distinguer d'un tableau
 * vide, qui signifie « aucune commune de ce nom ». Le pro doit savoir lequel
 * des deux s'est produit.
 */
export async function chercherCommunes(saisie: string): Promise<Commune[] | null> {
  const terme = citySearchTerm(saisie)
  if (terme.length < 2) return []

  const cle = terme
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  if (cle.length < 2) return []

  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('communes')
    .select('insee_code, name, postal_codes, lat, lng')
    // Recherche par préfixe, sur la clé normalisée : « st paul » trouve
    // « Saint-Paul » sans dépendre d'une extension Postgres.
    .like('search_key', `${cle}%`)
    // Les homonymes se classent par importance : « Saint-Paul » propose la
    // plus grande avant les six autres.
    .order('population', { ascending: false })
    .limit(MAX_RESULTATS)

  if (error) {
    // Le message et le code, pas seulement le nom : sans eux, un diagnostic
    // coûte une session entière. Aucune donnée personnelle ici, une commune
    // n'en est pas une.
    console.error('communes_lecture_failed', error.code, error.message)
    return null
  }

  return data.map((c) => ({
    insee_code: c.insee_code,
    name: c.name,
    postal_code: c.postal_codes[0] ?? null,
    lat: c.lat,
    lng: c.lng,
  }))
}

export type { Commune }
