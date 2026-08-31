import Link from 'next/link'

/**
 * B11 — le paramétrage de l'activité.
 *
 * C'est l'écran qui alimente tout le reste : sans prestations, sans zone et
 * sans horaires, le moteur géo n'a rien à manger et aucun créneau ne peut être
 * proposé. D'où sa place en tête de la Phase 1.
 */

const SECTIONS = [
  { href: '/app/parametrage/prestations', texte: 'Prestations' },
  { href: '/app/parametrage/zone', texte: 'Zone d’intervention' },
  { href: '/app/parametrage/horaires', texte: 'Horaires' },
  { href: '/app/parametrage/conges', texte: 'Congés' },
  { href: '/app/parametrage/profil', texte: 'Ma page' },
]

export default function LayoutParametrage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-10 sm:grid-cols-[13rem_1fr]">
      <nav aria-label="Paramétrage">
        <ul className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-champ px-4 py-3 font-semibold whitespace-nowrap hover:bg-fond"
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
