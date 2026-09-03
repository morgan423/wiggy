import Link from 'next/link'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { badgeDeCloche, RETENTION_JOURS } from '@/lib/notifications'

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

  const badge = badgeDeCloche(count ?? 0)

  return (
    <Link
      href="/app/notifications"
      aria-label="Pendant que tu coiffais"
      data-cloche
      className="tactile relative size-11 shrink-0 rounded-pilule text-texte-sur-plein hover:bg-texte-sur-plein/14"
    >
      {/* Une cloche dessinée : elle ne dépend d'aucune police ni d'aucun rendu
          système, et elle est identique sur les deux enveloppes. */}
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2a5 5 0 0 0-5 5v3.6l-1.4 2.8A1 1 0 0 0 6.5 15h11a1 1 0 0 0 .9-1.6L17 10.6V7a5 5 0 0 0-5-5Z" />
        <path d="M10 17a2 2 0 1 0 4 0h-4Z" />
      </svg>
      {badge ? (
        <span className="absolute top-1 right-1 rounded-pilule bg-action px-1.5 py-px text-[10px] font-extrabold text-texte-sur-plein">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
