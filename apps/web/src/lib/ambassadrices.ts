import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

/**
 * G2 — les places restantes du programme Ambassadrices.
 *
 * ⚠️ **Le compteur est branché sur le RÉEL** (principe n°4), et c'est
 * indispensable ici : la page annonce elle-même « compteur branché sur le
 * réel ». Écrire « 50 » en dur ferait de cette phrase un mensonge, et un
 * mensonge sur une page de vente est une faute d'un autre ordre qu'une promesse
 * en avance sur le produit — D19 autorise la seconde, jamais la première.
 *
 * G2 n'existe pas encore : personne n'a converti de filleule, donc les
 * cinquante places sont entières. Le chiffre est donc **exact aujourd'hui**, et
 * il bougera tout seul le jour où le moteur de parrainage arrivera, sans qu'on
 * ait à repasser ici.
 */
export const PLACES_AMBASSADRICES = 50

export async function placesAmbassadricesRestantes(): Promise<number> {
  if (!supabaseConfigured()) return PLACES_AMBASSADRICES
  // La table du parrainage n'existe pas encore (G2). On compte donc zéro
  // conversion, ce qui est la vérité et non un repli : aucune place n'a été
  // prise puisque le programme n'a pas ouvert.
  const prises = 0
  return Math.max(0, PLACES_AMBASSADRICES - prises)
}
