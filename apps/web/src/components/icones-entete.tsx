import { requirePro } from '@/lib/auth'
import { Cloche } from './cloche'
import { MenuCompte } from './menu-compte'
import { Avatar } from './avatar'

/**
 * La paire d'icônes de l'en-tête pro : la cloche, puis le compte. Planche 18a.
 *
 * Les deux vont ensemble et se rendent au même endroit sur chaque écran ; les
 * séparer, c'est laisser l'une apparaître sans l'autre selon la page, et la
 * planche les montre côte à côte dans le même bandeau. Une seule pièce, donc,
 * et l'ordre ne se discute plus à chaque écran.
 *
 * `requirePro` est déjà appelé par la page qui nous rend : la relire ici ne
 * coûte rien de plus, la requête est mise en cache pour la durée du rendu.
 */
export async function IconesEntete() {
  const { pro } = await requirePro()

  return (
    <>
      <Cloche />
      <MenuCompte
        avatar={
          // La silhouette ne s'efface QUE si la pro a réellement un visage à
          // mettre à la place. Sans photo, `Avatar` retomberait sur l'initiale
          // sur pastille, qui n'est pas ce que la planche demande ici.
          pro.photo_url ? (
            <Avatar nom={pro.display_name} photoUrl={pro.photo_url} taille="xs" />
          ) : undefined
        }
      />
    </>
  )
}
