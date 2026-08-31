import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatEuros } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { supabaseServer } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/admin'
import { Avatar } from '@/components/avatar'
import { ConditionsReservation } from '@/components/conditions-reservation'

const C = copy.reservationCliente

/**
 * A1 : la page publique du pro.
 *
 * C'est le lien qu'il partage et ce que Google indexe (A2). Elle n'existe que
 * si la fiche est publiée : la RLS ne renvoie rien sinon, et la page répond 404
 * plutôt que d'exposer un profil en cours de configuration.
 *
 * Registre : vouvoiement chaleureux, du premier mot au dernier.
 */

type Parametres = { params: Promise<{ slug: string }> }

async function chargerFiche(slug: string) {
  if (!supabaseConfigured()) return null
  const supabase = await supabaseServer()

  const { data: pro } = await supabase
    .from('pros')
    .select(
      'id, slug, display_name, headline, bio, city, photo_url, instagram_url, years_experience',
    )
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (!pro) return null

  const [prestations, reglages, communes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, price_cents, duration_min, deposit_percent')
      .eq('pro_id', pro.id)
      .eq('active', true)
      // Tri sur `position` seulement : `created_at` n'est pas dans les colonnes
      // accordées au rôle anonyme, et trier sur une colonne qu'on n'a pas le
      // droit de lire fait échouer toute la requête.
      .order('position')
      .order('name'),
    supabase
      .from('pro_settings')
      .select(
        'payment_mode, default_deposit_percent, booking_confirmation_mode, free_cancellation_hours',
      )
      .eq('pro_id', pro.id)
      .maybeSingle(),
    supabase
      .from('service_area_communes')
      .select('insee_code, name')
      .eq('pro_id', pro.id)
      .order('name'),
  ])

  // Une requête qui échoue ne doit pas se confondre avec une fiche vide : sans
  // cette trace, une prestation invisible passerait pour une absence de
  // prestation, et personne ne chercherait la cause.
  for (const [quoi, resultat] of [
    ['prestations', prestations],
    ['reglages', reglages],
    ['communes', communes],
  ] as const) {
    if (resultat.error) console.error(`page_publique_${quoi}_failed`, resultat.error.code)
  }

  return {
    pro,
    prestations: prestations.data ?? [],
    reglages: reglages.data,
    communes: communes.data ?? [],
  }
}

export async function generateMetadata({ params }: Parametres): Promise<Metadata> {
  const { slug } = await params
  const fiche = await chargerFiche(slug)
  if (!fiche) return { title: 'Page introuvable', robots: { index: false } }

  const { pro, communes } = fiche
  const ou = pro.city ?? communes[0]?.name
  const titre = ou
    ? `${pro.display_name}, coiffure à domicile à ${ou}`
    : `${pro.display_name}, coiffure à domicile`

  return {
    title: titre,
    description:
      pro.headline ??
      `Réservez votre rendez-vous avec ${pro.display_name}${ou ? `, qui se déplace à ${ou}` : ''}.`,
    alternates: { canonical: `/${pro.slug}` },
    openGraph: { title: titre, type: 'profile' },
  }
}

export default async function PagePublique({ params }: Parametres) {
  const { slug } = await params
  const fiche = await chargerFiche(slug)
  if (!fiche) notFound()

  const { pro, prestations, reglages, communes } = fiche
  const prenom = pro.display_name.split(' ')[0] ?? pro.display_name
  const moinsChere = prestations.reduce<number | undefined>(
    (mini, p) => (mini === undefined || p.price_cents < mini ? p.price_cents : mini),
    undefined,
  )

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="flex flex-wrap items-center gap-6">
        <Avatar nom={pro.display_name} photoUrl={pro.photo_url} taille="lg" />
        <div>
          <h1 className="display tracking-tight">{pro.display_name}</h1>
          {pro.headline ? (
            <p className="mt-2 text-lg text-texte-secondaire">{pro.headline}</p>
          ) : null}
          {communes.length > 0 ? (
            <p className="mt-2 text-texte-secondaire">
              {C.$aEcrire.zoneIntervention} {communes.map((c) => c.name).join(', ')}
            </p>
          ) : null}
        </div>
      </header>

      {pro.bio ? <p className="mt-8 text-lg whitespace-pre-line">{pro.bio}</p> : null}

      <section className="mt-12">
        <h2 className="titre tracking-tight">
          {remplir(C.$aEcrire.prestationsTitre, { pro: prenom })}
        </h2>
        {prestations.length === 0 ? (
          <p className="mt-4 text-texte-secondaire">Aucune prestation pour le moment.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {prestations.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-carte border-2 border-trait-discret p-5"
              >
                <span className="text-lg font-bold">{p.name}</span>
                <span className="text-texte-attenue">{p.duration_min} min</span>
                <span className="ml-auto text-lg font-bold">{formatEuros(p.price_cents)}</span>
                {p.description ? (
                  <span className="w-full text-texte-secondaire">{p.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reglages ? (
        <section className="mt-12 rounded-bloc bg-fond p-8">
          <h2 className="titre tracking-tight">Réserver avec {prenom}</h2>
          <ConditionsReservation
            prenomPro={prenom}
            prixCents={moinsChere}
            confirmationManuelle={reglages.booking_confirmation_mode === 'manual'}
            reglages={{
              mode: reglages.payment_mode,
              defaultDepositPercent: reglages.default_deposit_percent,
              freeCancellationHours: reglages.free_cancellation_hours,
            }}
          />
          <a
            href={`/${pro.slug}/reserver`}
            className="tactile mt-8 rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
          >
            Choisir un créneau
          </a>
        </section>
      ) : null}

      {pro.instagram_url ? (
        <p className="mt-10">
          <a
            href={pro.instagram_url}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="tactile font-semibold text-action hover:underline"
          >
            Voir son Instagram
          </a>
        </p>
      ) : null}
    </main>
  )
}
