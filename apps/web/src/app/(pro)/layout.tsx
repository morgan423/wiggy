import Link from 'next/link'

/**
 * Cadre commun aux écrans d'authentification, planche 14b.
 *
 * Même anatomie que l'espace pro (D12) : une colonne bornée, centrée, qui
 * respire en grand sans rien déplacer. Le contenu, lui, est un plein prune :
 * ces écrans-là n'ont pas de barre de navigation, ils n'ont qu'une chose à
 * faire faire.
 */
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-2 p-4">
      <Link href="/" className="text-[12px] font-bold text-texte-attenue hover:text-action">
        ← Wiggy
      </Link>
      {children}
    </main>
  )
}
