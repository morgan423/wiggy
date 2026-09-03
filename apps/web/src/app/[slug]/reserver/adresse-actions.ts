'use server'

import { chercherAdresses, type SuggestionSaisie } from '@/lib/adresse'

/**
 * B12 — la recherche d'adresses, exposée aux écrans.
 *
 * Une action serveur et non un appel depuis le navigateur : la BAN est
 * gratuite et sans clé, mais la faire appeler par chaque visiteur nous
 * priverait de toute mesure et de tout plafond le jour où il en faudrait un.
 * Le même raisonnement que pour Google, appliqué avant d'en avoir besoin.
 */
export async function chercherAdressesAssistee(terme: string): Promise<SuggestionSaisie[]> {
  return chercherAdresses(terme)
}
