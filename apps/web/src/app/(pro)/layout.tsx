import Link from 'next/link'

/** Cadre commun aux écrans d'authentification. */
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm font-semibold text-texte-secondaire hover:text-action">
        ← Wiggy
      </Link>
      {children}
    </main>
  )
}
