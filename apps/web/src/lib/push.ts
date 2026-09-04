import webpush from 'web-push'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

/**
 * C9 ③ — les notifications push web.
 *
 * La bêta tourne sur le web mobile durci en PWA (D4) : le push web est le SEUL
 * moyen d'atteindre la pro quand l'application est fermée. Sans lui, un rappel
 * de départ n'arrive que si elle pense à ouvrir l'app, c'est-à-dire exactement
 * quand elle n'en a pas besoin.
 *
 * **Le contenu est chiffré de bout en bout par le navigateur.** Ni Apple ni
 * Google ne lisent le prénom d'une cliente en transit : c'est une propriété du
 * protocole, pas une promesse de notre part. On envoie tout de même le
 * strict nécessaire, par principe de minimisation.
 *
 * ⚠️ **Sans clés VAPID configurées, RIEN NE PART, et c'est dit.** Une bascule
 * qui existe pendant que rien ne s'envoie est pire qu'une bascule absente : la
 * pro croit être prévenue et ne l'est pas. `pushConfigure()` répond à la
 * question, et l'écran de réglages l'affiche.
 */

const SUJET = 'mailto:contact@wiggy.fr'

export function pushConfigure(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/** La clé publique, que le navigateur doit connaître pour s'abonner. */
export function clePubliquePush(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

function configurer(): boolean {
  if (!pushConfigure()) return false
  webpush.setVapidDetails(
    SUJET,
    process.env.VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  )
  return true
}

/**
 * Envoie une notification à TOUS les appareils de la pro.
 *
 * Un abonnement mort (404 ou 410 : navigateur désinstallé, abonnement révoqué)
 * **se supprime tout seul**. Sans cela, la table grossit indéfiniment
 * d'appareils qui n'existent plus, et chaque envoi paie leur temps d'attente.
 *
 * Rend le nombre d'appareils réellement atteints. Zéro n'est pas une erreur :
 * une pro peut n'avoir accepté le push sur aucun appareil, ce qui est son droit.
 */
export async function pousser(
  proId: string,
  charge: { titre: string; corps?: string | null; lien?: string | null },
): Promise<number> {
  if (!supabaseConfigured() || !configurer()) return 0

  const { data: abonnements } = await supabaseAdmin()
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('pro_id', proId)
  if (!abonnements || abonnements.length === 0) return 0

  const corps = JSON.stringify({
    titre: charge.titre,
    corps: charge.corps ?? '',
    lien: charge.lien ?? '/app/notifications',
  })

  let atteints = 0
  const morts: string[] = []
  await Promise.all(
    abonnements.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          corps,
          { TTL: 3600 },
        )
        atteints += 1
      } catch (erreur) {
        const code = (erreur as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) morts.push(a.id)
        else console.error('push_echec', code)
      }
    }),
  )

  if (morts.length > 0) {
    await supabaseAdmin().from('push_subscriptions').delete().in('id', morts)
  }
  if (atteints > 0) {
    await supabaseAdmin()
      .from('push_subscriptions')
      .update({ last_ok_at: new Date().toISOString() })
      .eq('pro_id', proId)
  }
  return atteints
}
