'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * La barre de navigation du bas, planche 14a.
 *
 * Elle n'est pas décorative : le cadre écrit que le ratio de la planche 8a est
 * « tenu par le duo header prune + nav prune ». Sans elle, la crème redevient
 * le fond de toute la page au lieu d'être la respiration entre deux masses.
 *
 * Mobile seulement. Sur grand écran, la navigation reste en tête (12a).
 *
 * ⚠️ La planche montre quatre entrées, dont « Clientes ». La fiche cliente
 * n'existe pas encore : elle est spécifiée en 16c, livraison 3. Une entrée qui
 * ne mène nulle part serait pire que son absence, la barre en porte donc trois
 * jusque-là.
 */

const ENTREES = [
  { href: '/app/tournee', texte: 'Tournée' },
  { href: '/app/agenda', texte: 'Agenda' },
  { href: '/app/parametrage', texte: 'Activité' },
]

export function NavMobile() {
  const chemin = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      className="sur-plein fixed inset-x-0 bottom-0 z-30 flex bg-prune text-texte-sur-plein sm:hidden"
    >
      {ENTREES.map((entree) => {
        const actif = chemin === entree.href || chemin.startsWith(`${entree.href}/`)
        return (
          <Link
            key={entree.href}
            href={entree.href}
            aria-current={actif ? 'page' : undefined}
            className={`tactile flex-1 flex-col py-3 text-sm font-bold ${
              actif ? 'text-celebration' : 'text-texte-sur-plein-doux'
            }`}
          >
            {entree.texte}
          </Link>
        )
      })}
    </nav>
  )
}
