import type { Point } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

/**
 * R2-7 bis, la réserve rurale : obligatoire ne doit jamais devenir impossible.
 *
 * L'adresse d'un rendez-vous manuel est exigée, mais en rural un hameau, un
 * lieu-dit ou une construction récente peuvent n'être reconnus par aucun
 * service d'adresses. Exiger une adresse *validée* rendrait alors impossible
 * l'enregistrement d'un rendez-vous que la pro sait parfaitement situer, et la
 * règle se retournerait contre la cible même du produit.
 *
 * L'adresse est donc conservée telle qu'elle a été écrite, et rattachée au
 * point connu le plus proche : le centre de la commune, que le référentiel
 * descendu en base (D6) nous donne désormais. Le trajet est approché, il
 * n'est plus absent, et le pro en est averti.
 */

export type PointApproche = { point: Point; commune: string } | null

/** Centre de la commune, par code postal, puis par nom si besoin. */
export async function centreDeCommune(
  codePostal: string | null | undefined,
  ville: string | null | undefined,
): Promise<PointApproche> {
  if (!supabaseConfigured()) return null
  const supabase = supabaseAdmin()

  if (codePostal && /^\d{5}$/.test(codePostal)) {
    const { data } = await supabase
      .from('communes')
      .select('name, lat, lng')
      .contains('postal_codes', [codePostal])
      // Un code postal peut couvrir plusieurs communes : la plus peuplée est
      // le pari le moins mauvais, et c'est celle que porte le bureau de poste.
      .order('population', { ascending: false })
      .limit(1)
    const commune = data?.[0]
    if (commune?.lat != null && commune.lng != null) {
      return { point: { lat: commune.lat, lng: commune.lng }, commune: commune.name }
    }
  }

  if (ville) {
    const { cleRechercheCommune } = await import('@wiggy/core')
    const { data } = await supabase
      .from('communes')
      .select('name, lat, lng')
      .eq('search_key', cleRechercheCommune(ville))
      .order('population', { ascending: false })
      .limit(1)
    const commune = data?.[0]
    if (commune?.lat != null && commune.lng != null) {
      return { point: { lat: commune.lat, lng: commune.lng }, commune: commune.name }
    }
  }

  return null
}
