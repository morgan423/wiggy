import type { Metadata } from 'next'
import { requirePro } from '@/lib/auth'
import { NavPrincipale } from '@/components/nav-principale'

export const metadata: Metadata = { robots: { index: false } }

/**
 * Le cadre de l'espace pro. Décision D12 : **une seule anatomie**, à toutes les
 * largeurs.
 *
 * Bandeau prune en tête d'écran, corps sur la crème, cartes sur la surface,
 * barre prune en navigation. La barre du haut et la colonne latérale du
 * paramétrage ont disparu : elles étaient un reliquat que personne n'avait
 * dessiné, et deux passages de la recette 6 ont été marqués cassés sur un rendu
 * grand écran qui n'existait sur aucune planche.
 *
 * Sur grand écran, la même anatomie respire : la barre se redresse en colonne à
 * gauche, le contenu se centre dans une colonne lisible. Le bureau reste
 * pleinement utilisable, il cesse d'être une conception séparée.
 *
 * `requirePro()` est appelé ici ET dans chaque page : le layout ne suffit pas,
 * une page peut être rendue sans son layout parent.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  await requirePro()

  return (
    <div className="min-h-screen sm:pl-52">
      {/* La marge basse laisse la place à la barre fixe, en mobile seulement :
          sur grand écran elle est à gauche et ne recouvre rien. */}
      <main className="mx-auto max-w-2xl px-6 py-10 pb-28 sm:pb-10">{children}</main>
      <NavPrincipale />
    </div>
  )
}
