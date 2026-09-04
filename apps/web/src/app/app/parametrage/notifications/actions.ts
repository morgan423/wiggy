'use server'

import { revalidatePath } from 'next/cache'
import { EVENEMENTS } from '@wiggy/core'
import type { Database } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Bascule une case de la matrice.
 *
 * ⚠️ **La clé n'est jamais construite à partir de ce que le client envoie sans
 * être vérifiée d'abord.** L'événement doit exister dans le registre et le
 * canal être l'un des deux : sans ce filtre, un appel fabriqué écrirait dans
 * n'importe quelle colonne de `pro_settings`, y compris celles qui n'ont rien à
 * voir avec les notifications.
 *
 * Et il n'y a **aucun canal « journal »** : le registre ne se coupe pas, donc
 * on n'offre pas le moyen de le couper.
 */
export async function basculerNotification(
  cle: string,
  // Volontairement `string` et non l'union : une action serveur reçoit ce qu'on
  // veut bien lui envoyer. Déclarer l'union ferait croire au contrôle de types
  // qu'elle est garantie, alors qu'elle ne l'est qu'à l'appel depuis nos
  // écrans. C'est la ligne ci-dessous qui la garantit vraiment.
  canal: string,
  valeur: boolean,
): Promise<void> {
  const { pro } = await requirePro()
  if (!EVENEMENTS.some((e) => e.cle === cle)) return
  if (canal !== 'badge' && canal !== 'push') return

  const supabase = await supabaseServer()
  // La colonne est construite après vérification, d'où le passage par un type
  // large : le typage généré ne sait pas qu'une clé composée l'a été à partir
  // d'un registre fermé, mais les deux gardes au-dessus, elles, le savent.
  const colonne = {
    [`${canal}_${cle}`]: valeur,
  } as Database['public']['Tables']['pro_settings']['Update']
  const { error } = await supabase.from('pro_settings').update(colonne).eq('pro_id', pro.id)
  if (error) console.error('bascule_notification_failed', error.code)
  revalidatePath('/app/parametrage/notifications')
}

/**
 * C9 ③ — mémorise l'abonnement push de CET appareil.
 *
 * `upsert` sur l'endpoint : le navigateur rend parfois le même endpoint après
 * une réinstallation, et un `insert` échouerait alors sur l'unicité en laissant
 * la pro devant un bouton qui ne marche pas sans dire pourquoi.
 */
export async function enregistrerAbonnement(abonnement: {
  endpoint: string
  p256dh: string
  auth: string
  appareil?: string
}): Promise<void> {
  const { pro } = await requirePro()
  if (!abonnement.endpoint || !abonnement.p256dh || !abonnement.auth) return
  const supabase = await supabaseServer()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      pro_id: pro.id,
      endpoint: abonnement.endpoint,
      p256dh: abonnement.p256dh,
      auth: abonnement.auth,
      appareil: abonnement.appareil ?? null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) console.error('abonnement_push_failed', error.code)
  revalidatePath('/app/parametrage/notifications')
}

/** Délie cet appareil. La RLS borne déjà la suppression à ses propres lignes. */
export async function oublierAbonnement(endpoint: string): Promise<void> {
  await requirePro()
  const supabase = await supabaseServer()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  revalidatePath('/app/parametrage/notifications')
}
