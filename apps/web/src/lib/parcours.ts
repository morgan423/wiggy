import { supabaseServer } from '@/lib/supabase/server'
import type { EtatEtapes } from '@wiggy/core'

/**
 * G3 — quelles étapes du parcours sont réellement faites.
 *
 * **Rien n'est stocké.** L'état se DÉDUIT de la base à chaque lecture : une
 * colonne « onboarding_done » mentirait le jour où la pro supprime sa dernière
 * prestation, et il faudrait alors la tenir à jour depuis cinq écrans
 * différents. Une déduction ne se désynchronise pas.
 */
export async function etapesFaites(proId: string): Promise<EtatEtapes> {
  const supabase = await supabaseServer()
  const [prestations, communes, horaires, fiche] = await Promise.all([
    supabase.from('services').select('id', { count: 'exact', head: true }),
    supabase.from('service_area_communes').select('insee_code', { count: 'exact', head: true }),
    supabase.from('working_hours').select('weekday', { count: 'exact', head: true }),
    supabase.from('pros').select('photo_url, published').eq('id', proId).maybeSingle(),
  ])

  return {
    prestations: (prestations.count ?? 0) > 0,
    zone: (communes.count ?? 0) > 0,
    horaires: (horaires.count ?? 0) > 0,
    photo: Boolean(fiche.data?.photo_url),
    // « Partager son lien » ne se constate pas : on ne saura jamais si elle l'a
    // collé dans sa bio. La mise en ligne est le plus proche fait vérifiable,
    // et c'est celui qui conditionne réellement la suite.
    partage: Boolean(fiche.data?.published),
  }
}
