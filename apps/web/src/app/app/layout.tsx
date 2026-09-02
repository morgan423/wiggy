import Link from 'next/link'
import type { Metadata } from 'next'
import { can } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { Avatar } from '@/components/avatar'
import { NavMobile } from '@/components/nav-mobile'
import { seDeconnecter } from '../(pro)/actions'

export const metadata: Metadata = { robots: { index: false } }

/**
 * Cadre de la webapp pro (surface ② de D3) : la gestion sur grand écran.
 * Le copilote temps réel n'est pas ici — il n'a de sens qu'en mobilité.
 *
 * `requirePro()` est appelé ici ET dans chaque page : le layout ne suffit pas,
 * une page peut être rendue sans son layout parent.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { pro, abonnement } = await requirePro()

  return (
    <div className="min-h-screen">
      {/*
        En 390, la planche 14a ne montre aucune barre en tête : l'écran s'ouvre
        sur son bandeau prune, et la navigation vit en bas. Le mobile fait foi ;
        la barre du haut reste pour le grand écran (12a). Elle se chevauchait
        d'ailleurs à 390, faute d'avoir jamais été regardée à cette largeur.
      */}
      <header className="hidden border-b border-trait-discret sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/app" className="text-lg font-extrabold tracking-tight">
            Wiggy
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {/* Le lien n'apparaît pas hors de l'offre qui l'inclut : la garde
                serveur de la page reste la sécurité, ceci n'est que le confort
                de ne pas proposer une porte fermée. */}
            {can(abonnement, 'tour_copilot') ? (
              <Link href="/app/tournee" className="font-semibold hover:text-action">
                Ma tournée
              </Link>
            ) : null}
            <Link href="/app/agenda" className="font-semibold hover:text-action">
              Agenda
            </Link>
            <Link href="/app/parametrage/prestations" className="font-semibold hover:text-action">
              Paramétrage
            </Link>
            <span className="flex items-center gap-3">
              <Avatar nom={pro.display_name} photoUrl={pro.photo_url} taille="sm" />
              <span className="hidden font-semibold text-texte-secondaire sm:inline">
                {pro.display_name}
              </span>
            </span>
            <form action={seDeconnecter}>
              <button
                type="submit"
                className="font-semibold text-texte-secondaire hover:text-action"
              >
                Se déconnecter
              </button>
            </form>
          </nav>
        </div>
      </header>
      {/* La marge basse laisse la place à la barre de navigation fixe. */}
      <main className="mx-auto max-w-5xl px-6 py-10 pb-28 sm:pb-10">{children}</main>
      <NavMobile />
    </div>
  )
}
