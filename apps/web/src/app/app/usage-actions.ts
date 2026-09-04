'use server'

import { requirePro } from '@/lib/auth'
import { mesurerPro } from '@/lib/telemetrie'

/**
 * E3 ⑧ — ce que seul le navigateur sait : l'installation sur l'écran d'accueil
 * et la consultation hors-ligne.
 *
 * Ces deux faits n'existent nulle part côté serveur. Une PWA installée envoie
 * exactement les mêmes requêtes qu'un onglet ordinaire, et une consultation
 * hors-ligne, par définition, n'envoie rien du tout — elle se signale au retour
 * du réseau.
 *
 * ⚠️ **L'action n'accepte que deux valeurs**, et rien de ce que le client
 * envoie d'autre n'entre en base : une action serveur reçoit ce qu'on veut bien
 * lui envoyer, et c'est ce filtre-ci qui la rend sûre, pas le typage.
 */
const ACTIONS = ['pwa_installee', 'consultation_hors_ligne'] as const

export async function mesurerUsageApp(action: string): Promise<void> {
  const { pro } = await requirePro()
  if (!(ACTIONS as readonly string[]).includes(action)) return
  await mesurerPro('usage_app', pro.id, { action })
}
