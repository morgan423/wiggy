import { cache } from 'react'
import { redirect } from 'next/navigation'
import { slugify, slugAvecSuffixe, type Capability, type SubscriptionState, can } from '@wiggy/core'
import { supabaseServer } from './supabase/server'

/**
 * Identité et droits du pro connecté.
 *
 * Règle qui ne souffre pas d'exception : l'identité vient de l'authentification,
 * jamais d'un paramètre d'URL, d'un champ de formulaire ou d'un en-tête. Toute
 * requête faite ensuite passe par le client soumis à la RLS.
 */

type Pro = {
  id: string
  slug: string
  display_name: string
  city: string | null
  photo_url: string | null
  published: boolean
}

export type ComptePro = {
  pro: Pro
  abonnement: SubscriptionState
}

/**
 * Mis en cache pour la durée de la requête : le layout et la page appellent
 * tous deux `requirePro()`, ce qui déclenchait deux créations concurrentes de
 * la fiche pro — et deux allers-retours d'authentification à chaque rendu.
 */
const compteProCourant = cache(async function compteProCourant(): Promise<ComptePro | null> {
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const pro = await trouverOuCreerPro(auth.user.id, nomDepuisMetadata(auth.user))
  if (!pro) return null

  const { data: abo } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('pro_id', pro.id)
    .maybeSingle()

  // Abonnement introuvable : on retombe au socle plutôt que d'ouvrir l'accès.
  // Le moindre privilège est le bon défaut quand l'état est incertain.
  const abonnement: SubscriptionState = abo
    ? { tier: abo.tier, status: abo.status }
    : { tier: 'tier_1', status: 'canceled' }

  return { pro, abonnement }
})

/** Exige un pro connecté. Renvoie vers la connexion sinon. */
export async function requirePro(): Promise<ComptePro> {
  const compte = await compteProCourant()
  if (!compte) redirect('/connexion')
  return compte
}

/**
 * Exige un pro connecté ET le droit d'accès à la fonctionnalité (§2).
 *
 * À appeler dans toute page ou action qui touche une capacité gatée. La
 * vérification côté client n'est qu'un confort d'affichage : celle-ci fait foi.
 *
 * ⚠️ La redirection pointe vers `/app/abonnement`, qui n'existe pas encore (G1) :
 * un pro hors offre atteindrait un 404. Les liens de navigation sont masqués
 * hors de l'offre qui les inclut, ce qui referme le cas courant.
 */
export async function requireCapability(capability: Capability): Promise<ComptePro> {
  const compte = await requirePro()
  if (!can(compte.abonnement, capability)) {
    redirect(`/app/abonnement?requiert=${encodeURIComponent(capability)}`)
  }
  return compte
}

function nomDepuisMetadata(user: {
  email?: string
  user_metadata?: Record<string, unknown>
}): string {
  const nom = user.user_metadata?.display_name
  if (typeof nom === 'string' && nom.trim()) return nom.trim()
  return user.email?.split('@')[0] ?? 'Mon activité'
}

/**
 * Crée la fiche pro à la première connexion si elle n'existe pas.
 *
 * L'inscription peut se terminer sans session (confirmation d'e-mail activée) :
 * la fiche ne peut donc pas toujours être créée au moment de l'inscription.
 * On la crée ici, au premier accès authentifié, ce qui couvre les deux cas.
 */
async function trouverOuCreerPro(userId: string, nom: string): Promise<Pro | null> {
  const supabase = await supabaseServer()
  const champs = 'id, slug, display_name, city, photo_url, published'

  const { data: existant } = await supabase
    .from('pros')
    .select(champs)
    .eq('id', userId)
    .maybeSingle()
  if (existant) return existant

  const base = slugify(nom)
  for (let rang = 1; rang <= 20; rang++) {
    const { data, error } = await supabase
      .from('pros')
      .insert({ id: userId, slug: slugAvecSuffixe(base, rang), display_name: nom })
      .select(champs)
      .maybeSingle()

    if (data) return data

    if (error?.code !== '23505') {
      console.error('creation_pro_failed', error?.code)
      return null
    }

    // 23505 recouvre DEUX conflits très différents, et les confondre coûtait
    // vingt tentatives inutiles :
    //   — `pros_slug_key` : le slug est déjà pris par un autre pro. Un suffixe
    //     résout le problème, on retente.
    //   — `pros_pkey` : notre propre fiche vient d'être créée en parallèle.
    //     Aucun suffixe n'y changera rien puisque la clé est l'identifiant du
    //     compte : il faut relire la ligne.
    // Plutôt que d'analyser le nom de la contrainte (fragile), on relit : si
    // notre fiche existe désormais, la course est perdue mais le résultat est
    // le bon.
    const { data: creeEntreTemps } = await supabase
      .from('pros')
      .select(champs)
      .eq('id', userId)
      .maybeSingle()
    if (creeEntreTemps) return creeEntreTemps
  }
  console.error('creation_pro_failed', 'slug_epuise')
  return null
}
