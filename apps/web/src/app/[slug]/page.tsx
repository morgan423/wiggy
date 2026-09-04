import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatEuros, balisageFiche } from '@wiggy/core'
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

  const [prestations, reglages, communes, realisations] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, price_cents, duration_min, deposit_percent, category')
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
    // A1, planche 15a : « Ses réalisations ». Une coiffeuse se choisit d'abord
    // sur ce qu'elle sait faire.
    supabase
      .from('pro_photos')
      .select('id, chemin')
      .eq('pro_id', pro.id)
      .order('position')
      .limit(6),
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
    realisations: realisations.data ?? [],
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

  const { pro, prestations, reglages, communes, realisations } = fiche

  /*
    A2 — le balisage de la fiche. Le constructeur vit dans `@wiggy/core` et
    n'accepte AUCUNE donnée de localisation de la pro : ni adresse, ni
    coordonnées, ni téléphone. Ce qui ne rentre pas ne peut pas fuir, et un test
    du noyau le vérifie clé par clé.
  */
  /*
    A7 — les avis PUBLIÉS, et seulement eux. La politique de la base ne laisse
    d'ailleurs pas sortir les autres : ni ceux en attente de modération, ni ceux
    que la pro a masqués.
  */
  const { data: avis } = await (
    await supabaseServer()
  )
    .from('avis')
    .select('id, prenom, note, texte')
    .eq('pro_id', pro.id)
    .eq('statut', 'publie')
    .order('publie_le', { ascending: false })
    .limit(6)

  const balisage = balisageFiche({
    nom: pro.display_name,
    slug: pro.slug,
    accroche: pro.headline,
    communes: communes.map((c) => c.name),
    prestations: prestations.map((p) => ({
      nom: p.name,
      prixCentimes: p.price_cents,
      dureeMin: p.duration_min,
    })),
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wiggy.fr'}/${pro.slug}`,
  })
  const prenom = pro.display_name.split(' ')[0] ?? pro.display_name
  const moinsChere = prestations.reduce<number | undefined>(
    (mini, p) => (mini === undefined || p.price_cents < mini ? p.price_cents : mini),
    undefined,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(balisage) }}
      />

      <main className="mx-auto max-w-2xl px-6 pt-12 pb-32">
        <header className="flex flex-wrap items-center gap-5">
          <Avatar nom={pro.display_name} photoUrl={pro.photo_url} taille="lg" />
          <div>
            <h1 className="display tracking-tight">{pro.display_name}</h1>
            {/* Planche 15a : l'accroche et la zone sur une même ligne. La zone
              s'affiche en COMMUNES : jamais une adresse, jamais une carte
              centrée sur le domicile de la pro. */}
            {(pro.headline ?? communes.length > 0) ? (
              <p className="mt-2 text-lg text-texte-secondaire">
                {[pro.headline, communes.map((c) => c.name).join(', ')].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </header>

        {/* La bio manquait à la page, relevé à la recette du 31/08. C'est
          pourtant elle qui donne envie : on choisit une personne. */}
        {pro.bio ? <p className="mt-8 text-lg whitespace-pre-line">{pro.bio}</p> : null}

        <p className="mt-6 font-bold">{remplir(C.$aEcrire.seDeplaceChezVous, { pro: prenom })}</p>

        <section className="mt-12">
          <h2 className="titre tracking-tight">
            {remplir(C.$aEcrire.prestationsTitre, { pro: prenom })}
          </h2>
          {prestations.length === 0 ? (
            <p className="mt-4 text-texte-secondaire">Aucune prestation pour le moment.</p>
          ) : (
            /*
            Planche 15a : les prestations sont des CARTES D'INFORMATION, pas des
            boutons. Une seule action sur la page, le bandeau du bas : taper une
            carte ne réserve pas.

            La DURÉE a disparu, et c'est délibéré (recette du 31/08). Elle
            n'aide pas la cliente à choisir, et elle engage la pro sur un temps
            qui varie d'une tête à l'autre.
          */
            /*
            B13 — affichage GROUPÉ quand la pro a catégorisé, LISTE PLATE
            sinon. Le groupe est un confort : une pro avec six prestations n'a
            rien à ranger, et sa page ne doit pas donner l'impression qu'il lui
            manque quelque chose.
          */
            <div className="mt-6 flex flex-col gap-8">
              {grouper(prestations).map(([groupe, liste]) => (
                <section key={groupe ?? 'sans-groupe'}>
                  {groupe ? (
                    <h3 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
                      {groupe}
                    </h3>
                  ) : null}
                  <ul className={`space-y-3 ${groupe ? 'mt-4' : ''}`}>
                    {liste.map((p) => (
                      <li key={p.id} className="rounded-carte bg-surface p-5">
                        <span className="flex flex-wrap items-baseline gap-x-4">
                          <span className="text-lg font-bold">{p.name}</span>
                          <span className="ml-auto text-lg font-bold">
                            {formatEuros(p.price_cents)}
                          </span>
                        </span>
                        {p.description ? (
                          <span className="mt-2 block text-texte-secondaire">{p.description}</span>
                        ) : null}
                        {p.deposit_percent ? (
                          <span className="mt-2 block text-sm text-texte-secondaire">
                            {remplir(C.$aEcrire.acompteSurCarte, {
                              pourcent: String(p.deposit_percent),
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        {/*
        Planche 15a : sans réalisation, la section DISPARAÎT. Jamais de bloc
        vide sur la page de quelqu'un qui débute : une page trouée dessert plus
        qu'une page courte.
      */}
        {realisations.length > 0 ? (
          <section className="mt-12">
            <h2 className="titre tracking-tight">{C.$aEcrire.realisationsTitre}</h2>
            <ul className="mt-6 flex snap-x gap-3 overflow-x-auto pb-2">
              {realisations.map((photo) => (
                <li key={photo.id} className="w-40 shrink-0 snap-start">
                  {/* Pas de `next/image` : ces URL viennent du stockage public et
                    changent avec lui. */}
                  <img
                    src={urlRealisation(photo.chemin)}
                    alt=""
                    className="aspect-[4/5] w-full rounded-carte object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {reglages ? (
          <section className="mt-12 rounded-bloc bg-surface p-8">
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
            {/* A8 : la page annonce qu'un forfait PEUT s'appliquer, jamais son
              montant. Un chiffre public ancrerait la pro trop bas quand le
              trajet est long, et la cliente le découvre dans sa proposition. */}
            <p className="mt-4 text-sm text-texte-secondaire">
              {remplir(C.$aEcrire.forfaitPossible, { pro: prenom })}
            </p>
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

        {/*
        Planche 15a : le CTA est COLLANT en bas d'écran, et il est réécrit.
        « Réserver » sec en entrée de page ne dit ni quoi, ni avec qui, ni ce
        qui se passe ensuite.
      */}
        <div
          data-nav-fixe
          className="sur-plein fixed inset-x-0 bottom-0 z-30 bg-prune px-6 py-4 text-texte-sur-plein"
        >
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-texte-sur-plein-doux">
              {remplir(C.$aEcrire.ctaSousTitre, { pro: prenom })}
            </span>
            <a
              href={`/${pro.slug}/reserver`}
              className="tactile rounded-pilule bg-action px-8 font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
            >
              {remplir(C.$aEcrire.ctaCollant, { pro: prenom })}
            </a>
          </div>
        </div>
        {avis?.length ? (
          <section className="mt-14 border-t border-trait-discret pt-10">
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              Ce qu’elles en disent
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {avis.map((a) => (
                <li key={a.id} className="rounded-carte bg-surface p-5">
                  <p className="flex items-center gap-2 text-[13px] font-bold">
                    {a.prenom}
                    <span aria-label={`${String(a.note)} sur 5`} className="text-celebration">
                      {'★'.repeat(a.note)}
                    </span>
                  </p>
                  {a.texte ? (
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-texte-secondaire">
                      « {a.texte} »
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  )
}

/**
 * L'URL publique d'une réalisation.
 *
 * Le chemin est stocké, pas l'URL : le domaine du stockage n'a pas à se figer
 * dans les données, et il changera le jour où l'on quittera Supabase.
 */
function urlRealisation(chemin: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/pro-realisations/${chemin}`
}

/**
 * B13 — les prestations par groupe, dans l'ordre de la pro.
 *
 * Sans aucune catégorie, un seul groupe sans titre : la liste est plate, et
 * rien à l'écran ne suggère qu'il manque un rangement. C'est la contrainte qui
 * compte dans B13, et elle se tient ici plutôt que dans l'écran.
 */
function grouper<T extends { category: string | null }>(prestations: T[]): [string | null, T[]][] {
  const groupes = new Map<string | null, T[]>()
  for (const p of prestations) {
    const cle = p.category ?? null
    groupes.set(cle, [...(groupes.get(cle) ?? []), p])
  }
  // Les prestations sans groupe ferment la liste : elles ne s'effacent pas, et
  // elles ne prennent pas la tête devant celles que la pro a rangées.
  return [...groupes.entries()].sort(([a], [b]) =>
    a === null ? 1 : b === null ? -1 : a.localeCompare(b),
  )
}
