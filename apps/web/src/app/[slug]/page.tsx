import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  formatEuros,
  balisageFiche,
  presenterCatalogue,
  prixDEntree,
  noteGlobale,
  formatNote,
  type PrestationCatalogue,
  type Catalogue,
} from '@wiggy/core'
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
  const catalogue = presenterCatalogue(prestations)
  const note = noteGlobale((avis ?? []).map((a) => a.note))
  const desCentimes = prixDEntree(prestations)

  /*
    ⚠️ LE CTA N'EST COLLANT QUE S'IL Y A QUELQUE CHOSE À FAIRE DÉFILER.

    20a ③ : « le CTA n'est pas collant ici, la page tient dans un écran. » Sur
    la page de quelqu'un qui débute — ni bio, ni réalisations, ni avis, deux
    prestations à plat — un bandeau fixe mangerait un huitième d'un écran déjà
    court, pour ramener vers un bouton qu'on voit déjà.

    La condition se calcule, elle ne se devine pas : rien à replier, rien à
    faire défiler après le catalogue. Aucun seuil de hauteur, qui dépendrait de
    l'appareil et serait donc faux quelque part.
  */
  const pageCourte =
    (catalogue.forme === 'plate' || catalogue.forme === 'vide') &&
    realisations.length === 0 &&
    (avis?.length ?? 0) === 0

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(balisage) }}
      />

      <main
        data-planche="20a"
        className={`mx-auto max-w-2xl px-6 pt-12 ${pageCourte ? 'pb-16' : 'pb-32'}`}
      >
        {/*
          ── ① L'IDENTITÉ ────────────────────────────────────────────────────
          Le bloc prune : qui elle est, où elle va, et ce qu'elle dit d'elle.
        */}
        {/*
          ⚠️ L'IDENTITÉ EST UN BLOC PRUNE, PAS DU TEXTE SUR LA PAGE.

          La planche 20a l'enferme dans du prune plein : avatar, nom, zone, bio
          et pastille, tout dedans. Je l'avais posé à même la crème, ce qui est
          exactement ce que la règle de ratio (planche 8a) refuse — le contenu
          vient DANS le bloc pleine couleur, pas à côté. Posé en frère, il rend
          une page presque entièrement crème, ce que la recette 4 a rejeté.
        */}
        <header
          data-section="identite"
          className="sur-plein -mx-6 flex flex-col gap-2.5 bg-prune px-[18px] py-5 text-texte-sur-plein sm:mx-0 sm:rounded-bloc"
        >
          <Avatar
            nom={pro.display_name}
            photoUrl={pro.photo_url}
            diametre={60}
            surPlein
            className="text-[26px]"
          />
          <h1 className="titre text-[30px] leading-none">{pro.display_name}</h1>
          {/* La zone s'affiche en COMMUNES : jamais une adresse, jamais une
              carte centrée sur le domicile de la pro. */}
          {(pro.headline ?? communes.length > 0) ? (
            <p className="text-[12px] text-texte-sur-plein-doux">
              {[pro.headline, communes.map((c) => c.name).join(' · ')].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          {pro.bio ? (
            <p className="text-[13px] leading-[1.5] whitespace-pre-line">{pro.bio}</p>
          ) : null}
          <p className="mt-1 flex flex-wrap items-center gap-2.5">
            {pro.instagram_url ? (
              <a
                href={pro.instagram_url}
                rel="noopener noreferrer nofollow"
                target="_blank"
                aria-label="Voir son Instagram"
                className="tactile flex size-[30px] items-center justify-center rounded-pilule bg-texte-sur-plein/15"
              >
                {/*
                  ⚠️ LA PLANCHE DESSINE CETTE ICÔNE EN TROIS BLOCS, et j'avais
                  d'abord posé un caractère « ◎ ». C'était de l'interprétation :
                  un glyphe de police ne se dessine pas pareil d'un appareil à
                  l'autre, il ne suit pas l'épaisseur voulue, et il n'a pas le
                  point en haut à droite qui fait qu'on reconnaît Instagram.
                  Trois blocs, aux mesures de la planche : carré de 14 arrondi à
                  5, cercle de 6 centré, point de 2 dans l'angle.
                */}
                <span aria-hidden className="relative block size-3.5 rounded-[5px] border-[1.5px]">
                  <span className="absolute top-[3px] left-[3px] size-1.5 rounded-pilule border-[1.5px]" />
                  <span className="absolute top-[1.5px] right-[1.5px] size-[2px] rounded-pilule bg-texte-sur-plein" />
                </span>
              </a>
            ) : null}
            <span className="rounded-pilule bg-celebration px-[11px] py-1.5 text-[11.5px] font-extrabold text-texte-sur-miel">
              {remplir(C.$aEcrire.seDeplaceChezVous, { pro: prenom })}
            </span>
          </p>
        </header>

        {/*
          ── ② LES CONDITIONS, ET C'EST TOUT LE SUJET DE 20a ─────────────────

          ⚠️ ELLES PASSENT AVANT LE CATALOGUE. Constat de Morgan avant recette :
          avec cinq ou six prestations, ce bloc et ses mentions tombaient sous
          la ligne de flottaison — or c'est LUI qui décide si une cliente
          réserve. Le catalogue, lui, supporte très bien d'être replié.

          Le « dès X € » devient donc la SEULE indication de prix visible à
          l'ouverture. Il porte un poids qu'il n'avait pas quand le tarif
          complet le suivait de trois lignes.
        */}
        {reglages ? (
          <section data-section="conditions" className="mt-10 rounded-bloc bg-surface p-8">
            <p className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
                {remplir(C.$aEcrire.reserverAvec, { pro: prenom })}
              </span>
              {desCentimes !== undefined ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-bold text-texte-secondaire">
                    {C.$aEcrire.des}
                  </span>
                  <span className="display text-[34px] tracking-tight text-action">
                    {formatEuros(desCentimes)}
                  </span>
                </span>
              ) : null}
            </p>

            <LigneDeNote note={note} />

            <ConditionsReservation
              prenomPro={prenom}
              prixCents={desCentimes}
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

        {/* ── ③ LE CATALOGUE, REPLIÉ ─────────────────────────────────────── */}
        {catalogue.forme === 'vide' ? null : (
          <section data-section="prestations" className="mt-10">
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              {C.$aEcrire.prestationsLabel}
            </h2>
            <CatalogueReplie catalogue={catalogue} />
          </section>
        )}

        {/* ── ④ LES RÉALISATIONS, si elles existent ──────────────────────── */}
        {realisations.length > 0 ? (
          <section data-section="realisations" className="mt-10">
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              {C.$aEcrire.realisationsTitre}
            </h2>
            <ul className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
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

        {/* ── ⑤ L'APPEL À RÉSERVER ───────────────────────────────────────── */}
        {pageCourte ? (
          <div className="mt-10 flex flex-col items-stretch gap-2 text-center">
            <a
              href={`/${pro.slug}/reserver`}
              className="tactile rounded-pilule bg-action px-5 text-center text-[15px] font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
            >
              {remplir(C.$aEcrire.ctaCollant, { pro: prenom })}
            </a>
            <span className="text-sm text-texte-secondaire">
              {remplir(C.$aEcrire.ctaSousTitre, { pro: prenom })}
            </span>
          </div>
        ) : (
          <div
            data-nav-fixe
            className="sur-plein fixed inset-x-0 bottom-0 z-30 bg-prune px-6 py-4 text-texte-sur-plein"
          >
            {/* EMPILÉ, et c'est la planche : le sous-titre au-dessus, le bouton
                pleine largeur dessous. Côte à côte, « Trouver un moment avec
                {prénom} » se coupait en deux lignes dès 390 px. */}
            <div className="mx-auto flex max-w-2xl flex-col gap-2 text-center">
              <span className="text-[13px] text-texte-sur-plein-doux">
                {remplir(C.$aEcrire.ctaSousTitre, { pro: prenom })}
              </span>
              <a
                href={`/${pro.slug}/reserver`}
                className="tactile rounded-pilule bg-action px-5 text-center text-[15px] font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
              >
                {remplir(C.$aEcrire.ctaCollant, { pro: prenom })}
              </a>
            </div>
          </div>
        )}

        {/* ── ⑥ LES AVIS, en bas, là où la note renvoie ──────────────────── */}
        {avis?.length ? (
          <section
            data-section="avis"
            id="avis"
            className="mt-14 border-t border-trait-discret pt-10"
          >
            <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
              Ce qu’elles en disent
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {avis.map((a) => (
                /*
                  ⚠️ EN `bg-surface` : les cartes d'avis étaient crème sur une
                  page crème, donc invisibles. Et le contrôle de `vues` ne
                  pouvait pas le voir — il ne sème AUCUN avis, donc cette
                  section ne s'affiche jamais pendant les captures. Un garde-fou
                  ne voit que ce que les données lui montrent, et c'est une
                  limite à connaître plutôt qu'à découvrir.
                */
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
 * La ligne de note du bloc conditions (20a).
 *
 * Trois formes, et la deuxième est celle qui compte : **à un ou deux avis, on
 * dit le nombre et pas la moyenne**. Le calcul et son motif vivent dans
 * `@wiggy/core` ; ici on ne fait que peindre ce qu'il rend.
 */
function LigneDeNote({ note }: { note: ReturnType<typeof noteGlobale> }) {
  if (note.forme === 'aucune') return null
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-2 text-[13.5px]">
      <span aria-hidden className="text-celebration">
        ★
      </span>
      <span className="font-bold">
        {note.forme === 'moyenne'
          ? remplir(C.$aEcrire.noteSur5, { note: formatNote(note.moyenne) })
          : remplir(C.$aEcrire.avisCompte, { n: String(note.nombre) })}
      </span>
      <a href="#avis" className="text-texte-attenue hover:text-texte-principal">
        {note.forme === 'moyenne'
          ? remplir(C.$aEcrire.noteAvecAvis, { n: String(note.nombre) })
          : C.$aEcrire.noteSansMoyenne}
      </a>
    </p>
  )
}

/**
 * Le catalogue replié (20a).
 *
 * ⚠️ **LE REPLI EST NATIF, ET C'EST UNE CONTRAINTE, PAS UN CONFORT.**
 *
 * `<details>` et rien d'autre : aucun JavaScript, aucun état, aucun chargement
 * au tap. Les prestations sont **dans la page dès le premier rendu**, donc
 * lisibles par les moteurs même repliées, et lisibles hors réseau. Charger au
 * tap aurait donné une page vide aux moteurs et un catalogue cassé dans le
 * métro — pour économiser quelques kilo-octets de texte.
 *
 * C'est la mécanique des offres repliées de 19b, à l'identique.
 */
function CatalogueReplie({ catalogue }: { catalogue: Catalogue }) {
  if (catalogue.forme === 'vide') return null

  if (catalogue.forme === 'plate') {
    return (
      <ul className="mt-4 flex flex-col gap-2">
        {catalogue.prestations.map((p) => (
          <RangeePrestation key={p.id} prestation={p} />
        ))}
      </ul>
    )
  }

  if (catalogue.forme === 'repliee') {
    return (
      <>
        <ul className="mt-4 flex flex-col gap-2">
          {catalogue.visibles.map((p) => (
            <RangeePrestation key={p.id} prestation={p} />
          ))}
        </ul>
        <details className="group mt-2 rounded-carte bg-surface">
          <summary className="tactile flex cursor-pointer list-none items-center justify-between gap-3 px-5 font-bold text-action [&::-webkit-details-marker]:hidden">
            {/* ⚠️ LE SINGULIER N'EST PAS SUR LA PLANCHE, et il arrive dès la
                4ᵉ prestation : trois à plat en laissent une seule dessous.
                « Ses 1 autres prestations » se lisait à l'écran. Trou de
                spécification comblé et journalisé, pas deviné en silence. */}
            {catalogue.repliees.length === 1
              ? C.$aEcrire.autresPrestationsUne
              : remplir(C.$aEcrire.autresPrestations, {
                  n: String(catalogue.repliees.length),
                })}
            <span aria-hidden className="text-texte-attenue group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="flex flex-col px-2 pb-1">
            {catalogue.repliees.map((p) => (
              <RangeePrestation key={p.id} prestation={p} dansUnGroupe />
            ))}
          </ul>
        </details>
      </>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {catalogue.groupes.map((groupe, rang) => (
        <details
          key={groupe.nom}
          /* ⚠️ LA PREMIÈRE ARRIVE DÉPLIÉE : la page montre des prix RÉELS sans
             un seul tap. Toutes fermées, elle donnerait un catalogue à ouvrir
             plutôt qu'un tarif à lire. */
          open={rang === 0}
          className="group rounded-carte bg-surface"
        >
          <summary className="tactile flex cursor-pointer list-none items-baseline gap-3 px-5 [&::-webkit-details-marker]:hidden">
            <span className="font-bold">{groupe.nom}</span>
            <span className="text-[13px] text-texte-attenue">
              {/* Le singulier, que la planche n'écrit pas non plus : elle ne
                  montre que des groupes de 2 à 5. « 1 prestations » se lisait. */}
              {groupe.prestations.length === 1
                ? C.$aEcrire.groupeCompteUne
                : remplir(C.$aEcrire.groupeCompte, { n: String(groupe.prestations.length) })}
            </span>
            <span className="ml-auto text-[13px] font-bold text-texte-secondaire">
              {remplir(C.$aEcrire.groupeDes, { prix: formatEuros(groupe.desCentimes) })}
            </span>
            <span aria-hidden className="text-texte-attenue group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="flex flex-col px-2 pb-1">
            {groupe.prestations.map((p) => (
              <RangeePrestation key={p.id} prestation={p} dansUnGroupe />
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}

/**
 * Une prestation : son nom, son prix, et rien de plus.
 *
 * ⚠️ **AUCUNE DURÉE**, décidé à la recette du 31/08 et inchangé : elle n'aide
 * pas la cliente à choisir, et elle engage la pro sur un temps qui varie d'une
 * tête à l'autre.
 */
function RangeePrestation({
  prestation,
  dansUnGroupe = false,
}: {
  prestation: PrestationCatalogue
  dansUnGroupe?: boolean
}) {
  /*
    ⚠️ DEUX FONDS, ET C'EST LE MÊME DÉFAUT ÉVITÉ DEUX FOIS.

    À plat, la rangée est une carte BLANCHE sur la page crème. Je les avais
    posées en crème : `npm run vues` a signalé trois blocs de la couleur exacte
    de leur fond avant que Morgan ne les voie — c'est très exactement la classe
    de défaut pour laquelle ce contrôle a été étendu à tous les écrans.

    DANS un groupe ouvert, l'inverse : la rangée du groupe est déjà blanche, et
    lui redonner une carte blanche referait disparaître la rangée. La planche
    les pose donc à même la carte du groupe, séparées par un filet.
  */
  return (
    <li
      className={`flex flex-wrap items-baseline gap-x-4 ${
        dansUnGroupe
          ? 'border-t border-trait-discret px-3 py-2.5 first:border-t-0'
          : 'rounded-carte bg-surface px-4 py-3'
      }`}
    >
      <span className="font-bold">{prestation.name}</span>
      <span className="ml-auto font-bold">{formatEuros(prestation.price_cents)}</span>
    </li>
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
