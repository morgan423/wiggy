import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import type { Database } from '@wiggy/api'

/**
 * B14 — le journal de ce qui s'est passé pendant que la pro coiffait.
 *
 * ⚠️ **On n'agit jamais depuis la cloche** (planche 17a). Ce module écrit des
 * FAITS ACCOMPLIS, au passé. Le jour où l'on serait tenté d'y ajouter un état
 * « à traiter », c'est qu'on est en train de refaire la file d'action de
 * l'agenda une seconde fois, et de brouiller la seule chose qui rend les deux
 * endroits utiles : l'un sert à agir, l'autre à savoir.
 *
 * Le texte est composé À L'ÉCRITURE et non à la lecture : un événement dit ce
 * qui s'est passé À CE MOMENT-LÀ, et le recomposer plus tard le ferait mentir
 * si la donnée a changé depuis.
 */

type Kind = Database['public']['Tables']['notifications']['Row']['kind']

export async function journaliser({
  proId,
  kind,
  titre,
  detail,
  lien,
}: {
  proId: string
  kind: Kind
  titre: string
  detail?: string | null
  lien?: string | null
}): Promise<void> {
  if (!supabaseConfigured()) return
  const { error } = await supabaseAdmin()
    .from('notifications')
    .insert({ pro_id: proId, kind, titre, detail: detail ?? null, lien: lien ?? null })
  if (error) console.error('journal_notification_failed', error.code)
}

/**
 * Le nombre de non-lus, plafonné à « 9+ » (planche 17a).
 *
 * Au-delà de neuf, le chiffre exact n'apporte rien : « 23 » et « 47 » disent la
 * même chose, qu'il s'est passé beaucoup de choses. Et **aucun badge quand il
 * n'y a rien** : une pastille à zéro est une pastille qui apprend à être
 * ignorée.
 */
export function badgeDeCloche(nonLus: number): string | null {
  if (nonLus <= 0) return null
  return nonLus > 9 ? '9+' : String(nonLus)
}

/**
 * Le journal se purge seul après trente jours (planche 17a).
 *
 * Purge à la lecture plutôt qu'en tâche planifiée : une tâche qui ne tourne pas
 * laisse grossir la table sans que personne le voie, alors qu'une purge liée à
 * l'usage se répare d'elle-même dès la prochaine ouverture.
 */
export const RETENTION_JOURS = 30
