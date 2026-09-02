import Link from 'next/link'

/**
 * B11 — le paramétrage de l'activité.
 *
 * C'est l'écran qui alimente tout le reste : sans prestations, sans zone et
 * sans horaires, le moteur géo n'a rien à manger et aucun créneau ne peut être
 * proposé. D'où sa place en tête de la Phase 1.
 */

const SECTIONS = [
  // Le hub (board 10c) est le point d'entrée : les écrans d'édition subsistent
  // derrière chaque section, ils cessent d'être la porte.
  { href: '/app/parametrage', texte: 'Ton activité' },
  { href: '/app/parametrage/prestations', texte: 'Prestations' },
  { href: '/app/parametrage/zone', texte: 'Zone d’intervention' },
  { href: '/app/parametrage/horaires', texte: 'Horaires' },
  { href: '/app/parametrage/conges', texte: 'Congés' },
  { href: '/app/parametrage/profil', texte: 'Ma page' },
]

export default function LayoutParametrage({ children }: { children: React.ReactNode }) {
  return (
    // En 390, la planche 14c fait du hub LA navigation du paramétrage : chaque
    // rangée résume et ouvre sa section. Une barre d'onglets par-dessus ferait
    // deux navigations concurrentes pour cinq écrans. Elle reste sur grand
    // écran, en colonne, comme le prévoit 12a.
    <div className="grid gap-10 sm:grid-cols-[13rem_1fr]">
      <nav aria-label="Paramétrage" className="hidden sm:block">
        <ul className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-champ px-4 py-3 font-semibold whitespace-nowrap hover:bg-surface"
              >
                {s.texte}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>{children}</div>
    </div>
  )
}
