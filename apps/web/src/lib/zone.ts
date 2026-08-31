import type { Zone } from '@wiggy/core'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Zone d'intervention du pro, telle que B11 ② l'a enregistrée.
 *
 * Lecture en droits élargis, comme le calcul des créneaux : ce qui en sort ne
 * décrit que le périmètre déclaré du pro, jamais une donnée de cliente.
 */
export async function zoneDuPro(proId: string): Promise<Zone | null> {
  const supabase = supabaseAdmin()
  const [aire, communes] = await Promise.all([
    supabase
      .from('service_areas')
      .select('mode, center_lat, center_lng, radius_km')
      .eq('pro_id', proId)
      .maybeSingle(),
    supabase.from('service_area_communes').select('insee_code, name, lat, lng').eq('pro_id', proId),
  ])

  if (
    aire.data?.mode === 'radius' &&
    aire.data.center_lat !== null &&
    aire.data.center_lng !== null &&
    aire.data.radius_km !== null
  ) {
    return {
      mode: 'radius',
      centre: { lat: aire.data.center_lat, lng: aire.data.center_lng },
      rayonKm: aire.data.radius_km,
    }
  }

  const liste = communes.data ?? []
  if (liste.length === 0) return null
  return {
    mode: 'communes',
    communes: liste.map((c) => ({
      inseeCode: c.insee_code,
      nom: c.name,
      point: c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null,
    })),
  }
}
