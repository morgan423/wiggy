import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { badgeDeCloche, RETENTION_JOURS } from '@/lib/notifications'
import { ClocheOuCroix } from './cloche-bouton'

/**
 * B14 — la cloche, planche 17a.
 *
 * **Ce n'est PAS un cinquième onglet.** Elle vit dans l'en-tête, à droite du
 * titre, sur chaque écran pro. Un onglet dirait « va ici régulièrement » ; une
 * cloche dit « il s'est passé quelque chose », ce qui est exactement la
 * différence entre agir et savoir.
 *
 * **Aucun badge quand il n'y a rien de non lu**, et « 9+ » au-delà de neuf :
 * une pastille permanente apprend à être ignorée, et le chiffre exact
 * n'apporte rien passé un certain nombre.
 *
 * D17 ⑤ — **elle se referme sur elle-même**. Ouvrir le centre la transforme en
 * croix, et la croix revient à l'écran précédent. Un panneau se ferme là où il
 * s'est ouvert, et la pro ne doit pas quitter l'écran sur lequel elle
 * travaillait pour avoir jeté un œil au journal.
 *
 * Le comptage reste serveur, la bascule est cliente : elle dépend de la route
 * affichée, que seul le navigateur connaît.
 */
export async function Cloche() {
  await requirePro()
  const supabase = await supabaseServer()
  const limite = new Date(Date.now() - RETENTION_JOURS * 86_400_000).toISOString()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('lu_le', null)
    .gte('created_at', limite)

  return <ClocheOuCroix badge={badgeDeCloche(count ?? 0)} />
}
