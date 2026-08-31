import type { Metadata } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

/**
 * Fraunces — display uniquement, jamais sous 20 px ni dans l'agenda.
 * L'axe WONK n'est activé que sur les statements, via la classe `.statement`.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  // Police variable : on ne fige pas les graisses, sinon les axes optiques
  // (dont WONK) ne peuvent pas être demandés.
  axes: ['SOFT', 'WONK', 'opsz'],
})

/** Plus Jakarta Sans — toute l'UI, et tout ce qui descend sous 20 px. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Wiggy : tes journées, bouclées',
    template: '%s · Wiggy',
  },
  // S4 : l'angle « rappels anti no-show » est déprioritisé, il ne doit
  // réapparaître ni dans le claim ni dans les métadonnées.
  description:
    'Wiggy remplit ton agenda en tournées logiques, tout seul. Toi, tu coiffes. ' +
    'L’app des coiffeuses et coiffeurs à domicile.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.wiggy.fr'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
