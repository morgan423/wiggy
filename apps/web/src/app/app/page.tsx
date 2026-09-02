import Link from 'next/link'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Accueil de la webapp pro. Registre : tutoiement (S6).
 *
 * Tant que le paramétrage (B11) n'est pas fait, le moteur géo n'a rien à
 * manger : cet écran met donc la configuration en tête, pas des statistiques
 * vides.
 */
export default async function AccueilApp() {
  const { pro, abonnement } = await requirePro()
  const supabase = await supabaseServer()

  // Comptages : la RLS restreint déjà à ce compte, pas besoin de filtrer.
  const [{ count: prestations }, { count: communes }, { count: horaires }] = await Promise.all([
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('service_area_communes').select('*', { count: 'exact', head: true }),
    supabase.from('working_hours').select('*', { count: 'exact', head: true }),
  ])

  const etapes = [
    {
      fait: (prestations ?? 0) > 0,
      texte: 'Créer tes prestations',
      lien: '/app/parametrage',
    },
    {
      fait: (communes ?? 0) > 0,
      texte: 'Définir ta zone d’intervention',
      lien: '/app/parametrage/zone',
    },
    {
      fait: (horaires ?? 0) > 0,
      texte: 'Poser tes horaires de travail',
      lien: '/app/parametrage/horaires',
    },
    {
      fait: pro.published,
      texte: 'Publier ta page de réservation',
      lien: '/app/parametrage/profil',
    },
  ]
  const restant = etapes.filter((e) => !e.fait).length

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-tight">
        {restant === 0 ? 'Tout est prêt.' : 'On finit de t’installer.'}
      </h1>

      {abonnement.status === 'trialing' ? (
        <p className="mt-4 text-texte-secondaire">Tu es en période d’essai sur l’offre complète.</p>
      ) : null}

      <ol className="mt-10 space-y-3">
        {etapes.map((etape) => (
          <li key={etape.lien}>
            <Link
              href={etape.lien}
              className="flex items-center gap-4 rounded-carte border-2 border-trait-discret p-5 hover:border-prune"
            >
              <span
                aria-hidden
                className={`flex size-8 shrink-0 items-center justify-center rounded-pilule text-sm font-bold ${
                  etape.fait
                    ? 'bg-celebration text-prune'
                    : 'border-2 border-trait-discret text-texte-secondaire'
                }`}
              >
                {etape.fait ? '✓' : ''}
              </span>
              <span
                className={`text-lg font-semibold ${etape.fait ? 'text-texte-secondaire line-through' : ''}`}
              >
                {etape.texte}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}
