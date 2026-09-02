'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * La navigation du produit, décision D12 : une seule anatomie, qui s'élargit.
 *
 * Barre prune en bas sur mobile, comme la planche 14a. Sur grand écran, la
 * MÊME barre se redresse en colonne à gauche : c'est la même anatomie qui
 * respire, pas une seconde conception. Deux mises en page coûtent deux
 * recettes et divergent toujours, et c'est celle qu'on regarde le moins qui
 * pourrit.
 *
 * ⚠️ La planche montre quatre entrées, dont « Clientes ». La fiche cliente est
 * spécifiée en 16c, livraison 3 : une entrée qui ne mène nulle part serait
 * pire que son absence. Écart ratifié par Morgan à la recette 6.
 */

const ENTREES = [
  { href: '/app/tournee', texte: 'Tournée' },
  { href: '/app/agenda', texte: 'Agenda' },
  { href: '/app/parametrage', texte: 'Activité' },
]

export function NavPrincipale() {
  const chemin = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      // `data-nav-fixe` : `npm run vues` la repose en flux le temps de la
      // capture, sinon elle s'imprime au milieu de l'image de page entière.
      data-nav-fixe
      className="sur-plein fixed inset-x-0 bottom-0 z-30 flex bg-prune text-texte-sur-plein sm:inset-y-0 sm:right-auto sm:w-52 sm:flex-col sm:justify-start sm:gap-1 sm:px-3 sm:py-8"
    >
      <span className="hidden px-3 pb-6 text-lg font-extrabold tracking-tight sm:block">Wiggy</span>
      {ENTREES.map((entree) => {
        const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`)
        return (
          <Link
            key={entree.href}
            href={entree.href}
            aria-current={actif ? 'page' : undefined}
            className={`tactile flex-1 flex-col py-3 text-sm font-bold sm:w-full sm:flex-none sm:justify-start sm:rounded-champ sm:px-3 sm:text-base ${
              actif
                ? 'text-celebration sm:bg-prune-survol'
                : 'text-texte-sur-plein-doux hover:text-texte-sur-plein'
            }`}
          >
            {entree.texte}
          </Link>
        )
      })}
    </nav>
  )
}
