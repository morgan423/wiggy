'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * La navigation du produit : barre prune, EN BAS, à toutes les largeurs.
 *
 * Planche 14a : `space-around`, `padding: 11px 8px`, libellés de 10 px en
 * extra-gras, doux sur le prune, miel pour l'entrée active. Décision D12 : une
 * seule anatomie à toutes les largeurs, « plus aucune planche bureau ».
 *
 * La colonne latérale de grand écran a été retirée le 03/09 : elle n'existait
 * sur aucune planche. Ce qui respire en grand, c'est la colonne de contenu, pas
 * la navigation qui se déplace. Une navigation qui change de place change aussi
 * de geste, et c'est deux mises en page à recetter au lieu d'une.
 *
 * La barre prune du bas et le bandeau prune du haut forment ensemble le ratio
 * de la planche 8a : la crème est la respiration entre deux masses pleines.
 *
 * Les quatre entrées de la planche sont là depuis le 03/09 : « Clientes » mène
 * enfin à la liste des fiches (B1), et l'écart ratifié à la recette 6 se
 * referme. Une entrée qui ne mène nulle part est pire que son absence ; une
 * entrée qui mène quelque part n'a plus de raison de manquer.
 */

const ENTREES = [
  { href: '/app/tournee', texte: 'Tournée' },
  { href: '/app/agenda', texte: 'Agenda' },
  { href: '/app/clientes', texte: 'Clientes' },
  // D17 : l'onglet se structure autour de la PRO, plus autour de ses
  // réglages. « Activité » descend d'un niveau et nomme le groupe des réglages
  // métier, à l'intérieur.
  { href: '/app/parametrage', texte: 'Profil' },
]

export function NavPrincipale() {
  const chemin = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      // `data-nav-fixe` : `npm run vues` la repose en flux le temps de la
      // capture, sinon elle s'imprime au milieu de l'image de page entière.
      data-nav-fixe
      className="sur-plein sticky bottom-0 z-30 flex justify-around bg-prune px-2 py-[11px] text-texte-sur-plein"
    >
      {ENTREES.map((entree) => {
        const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`)
        return (
          <Link
            key={entree.href}
            href={entree.href}
            aria-current={actif ? 'page' : undefined}
            className={`tactile flex-1 text-[10px] font-extrabold ${
              actif ? 'text-celebration' : 'text-texte-sur-plein-doux hover:text-texte-sur-plein'
            }`}
          >
            {entree.texte}
          </Link>
        )
      })}
    </nav>
  )
}
