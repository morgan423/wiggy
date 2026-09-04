import type { Metadata } from 'next'
import { requirePro } from '@/lib/auth'
import { NavPrincipale } from '@/components/nav-principale'
import { EnregistrerServiceWorker } from '@/components/pwa'

export const metadata: Metadata = { robots: { index: false } }

/**
 * Le cadre de l'espace pro. Planche 14a, « lu une fois, valable pour tous les
 * écrans », et décision D12 : **une seule anatomie**, à toutes les largeurs.
 *
 * De haut en bas : bandeau prune, corps sur la crème avec ses cartes sur la
 * surface, barre prune de navigation. Le corps est en `flex-1` pour que les
 * états vides des planches 14d et 14f se centrent dans la hauteur restante, et
 * la barre est en bas de cette colonne, à toutes les largeurs.
 *
 * Sur grand écran, c'est la COLONNE qui respire, bornée à une largeur lisible
 * et centrée. Rien ne change de place : ni la navigation, ni le bandeau. La
 * colonne latérale, que personne n'avait dessinée, a fait marquer deux passages
 * cassés à la recette 6 ; elle est retirée.
 *
 * La gouttière de 16 px et le retrait de 14 px viennent des planches. Le
 * bandeau les déborde par marges négatives : sur la planche, le prune touche
 * les bords de l'écran.
 *
 * `requirePro()` est appelé ici ET dans chaque page : le layout ne suffit pas,
 * une page peut être rendue sans son layout parent.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  await requirePro()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <EnregistrerServiceWorker />
      <main className="flex flex-1 flex-col px-4 pt-3.5">{children}</main>
      <NavPrincipale />
    </div>
  )
}
