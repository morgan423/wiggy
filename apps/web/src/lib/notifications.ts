import { REGLAGE_DU_KIND, badgeActif, pushActif } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { pousser } from '@/lib/push'
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
  /*
    ⚠️ AUCUN RÉGLAGE N'EST CONSULTÉ ICI, et c'est le cœur de B14. Le journal
    reçoit TOUT, TOUJOURS. Les bascules de la pro décident du BADGE et du PUSH,
    jamais de l'écriture : un registre qu'on peut couper crée des trous
    invisibles, et elle ne sait pas ce qu'elle ne voit pas.
  */
  const { error } = await supabaseAdmin()
    .from('notifications')
    .insert({ pro_id: proId, kind, titre, detail: detail ?? null, lien: lien ?? null })
  if (error) console.error('journal_notification_failed', error.code)

  // ③ Le push, lui, se règle. Il part après l'écriture : une notification
  // qu'on n'a pas réussi à journaliser ne doit pas partir dans la poche.
  if (!error) await pousserSiVoulu(proId, kind, titre, detail, lien)
}

/**
 * Les `kind` dont le badge de la cloche doit tenir compte, pour cette pro.
 *
 * Le comptage ne peut plus être « tous les non-lus » : la pro règle le badge
 * événement par événement. Un `kind` sans réglage connu compte toujours, plutôt
 * que de disparaître en silence — mieux vaut une pastille de trop qu'un fait
 * qu'on ne verra jamais.
 */
export async function kindsQuiComptent(proId: string): Promise<Kind[] | null> {
  const { data } = await supabaseAdmin()
    .from('pro_settings')
    .select('*')
    .eq('pro_id', proId)
    .maybeSingle()
  const reglages = (data ?? {}) as Record<string, boolean | null>
  const tous = Object.keys(REGLAGE_DU_KIND) as Kind[]
  const retenus = tous.filter((kind) => badgeActif(reglages, REGLAGE_DU_KIND[kind]))
  return retenus.length === tous.length ? null : retenus
}

/**
 * ③ Le push, si la pro le veut pour CET événement.
 *
 * Le défaut suit la règle du 04/09 : on interrompt quand l'événement change
 * l'agenda ou attend une action, jamais quand il est seulement agréable à
 * savoir. Un avis à cinq étoiles fait plaisir, il n'a pas à couper une
 * prestation.
 */
async function pousserSiVoulu(
  proId: string,
  kind: Kind,
  titre: string,
  detail?: string | null,
  lien?: string | null,
): Promise<void> {
  const cle = REGLAGE_DU_KIND[kind]
  if (!cle) return
  const { data } = await supabaseAdmin()
    .from('pro_settings')
    .select('*')
    .eq('pro_id', proId)
    .maybeSingle()
  if (!pushActif((data ?? {}) as Record<string, boolean | null>, cle)) return
  await pousser(proId, { titre, corps: detail, lien })
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
