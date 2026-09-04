import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatEuros, formatDistance, ZONE, repartirEnEtages } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { supabaseServer } from '@/lib/supabase/server'
import { modeDuPro } from '@/lib/mode'
import { ChampAdresse } from '@/components/champ-adresse'
import { ChampGet } from '@/components/champ-get'
import { supabaseConfigured } from '@/lib/supabase/admin'
import { creneauxProposables } from '@/lib/creneaux'
import { canalDeRappel } from '@/lib/rappel'
import { mesurerVisite } from '@/lib/telemetrie'
import { chercherHebergements } from '@/lib/lieux'
import { FormCoordonnees } from './coordonnees-form'
import { BlocAcceptation } from '@/components/acceptation'
import { FormPhotos } from './photos-form'

/**
 * A3 : le parcours de réservation. Un geste par écran, comme le veut le board.
 *
 * L'étape courante se lit dans l'URL : la cliente peut revenir en arrière,
 * partager le lien, recharger la page sans rien perdre. Aucun état caché.
 *
 * A5 et A6 sont les deux sorties de la même impasse. Une adresse hors zone
 * n'est jamais un mur : soit la cliente y séjourne et donne l'adresse du
 * séjour (A5), soit elle fait sa demande sous réserve et le pro tranche (A6).
 *
 * Registre : vouvoiement, du premier mot au dernier. Le contenu vient du copy
 * deck, pas de l'inspiration du moment.
 */

const C = copy.reservationCliente

export const metadata: Metadata = { robots: { index: false } }

type Recherche = {
  p?: string
  a?: string
  cp?: string
  v?: string
  c?: string
  /** A6 : la cliente a vu l'avertissement hors zone et demande quand même. */
  sr?: string
  /** A5 : bornes du séjour, quand la cliente n'habite pas à cette adresse. */
  du?: string
  au?: string
  /** Sous-écran de saisie du séjour, et sa recherche d'hôtel. */
  etape?: string
  h?: string
  /** A4 : étape des photos franchie, et jeton du dépôt s'il y en a un. */
  ph?: string
  d?: string
}

const jourFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const heureFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
/** « Mar 12 », le format des pastilles du premier étage (planche 15b). */
const jourCourtFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'short',
  day: 'numeric',
})

export default async function Reserver({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Recherche>
}) {
  const { slug } = await params
  const q = await searchParams
  if (!supabaseConfigured()) notFound()

  const supabase = await supabaseServer()
  const { data: pro } = await supabase
    .from('pros')
    .select('id, slug, display_name, pronoun')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (!pro) notFound()

  const prenom = pro.display_name.split(' ')[0] ?? pro.display_name
  // D10 ① — en mode fixe, la cliente se déplace : l'étape adresse n'existe
  // pas. Aucune adresse n'est demandée, ni collectée, ni enregistrée.
  const modePro = await modeDuPro(supabase, pro.id)
  const { data: prestations } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_min, category, photos_required')
    .eq('pro_id', pro.id)
    .eq('active', true)
    .order('position')
    .order('name')

  const prestation = prestations?.find((p) => p.id === q.p)
  // Le canal réellement utilisé, jamais le palier. Trois causes, un seul rendu.
  const canal = await canalDeRappel(pro.id)
  const chemin = `/${pro.slug}/reserver`
  /** Les paramètres courants, en chaînes : sérialisables, donc traversables. */
  const parametres: Record<string, string> = Object.fromEntries(
    Object.entries(q).filter((entree): entree is [string, string] => Boolean(entree[1])),
  )
  const lien = (ajouts: Recherche) => {
    const params = new URLSearchParams()
    for (const [cle, valeur] of Object.entries({ ...q, ...ajouts })) {
      if (valeur) params.set(cle, valeur)
    }
    return `${chemin}?${params.toString()}`
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/${pro.slug}`}
        className="text-sm font-semibold text-texte-secondaire hover:text-action"
      >
        ← {pro.display_name}
      </Link>

      {/* Étape 1 : la prestation. */}
      {!prestation ? (
        <>
          <h1 className="display mt-6 tracking-tight">{C.prestations.titre}</h1>
          {/*
            B13 — sélection par FAMILLE quand la pro a catégorisé. Sans
            catégorie, une seule liste, et rien ne change pour elle.
          */}
          <div className="mt-8 flex flex-col gap-8">
            {parFamille(prestations ?? []).map(([famille, liste]) => (
              <section key={famille ?? 'sans-famille'}>
                {famille ? (
                  <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
                    {famille}
                  </h2>
                ) : null}
                <ul className={`space-y-3 ${famille ? 'mt-4' : ''}`}>
                  {liste.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={lien({ p: p.id })}
                        className="flex flex-wrap items-baseline gap-x-4 rounded-carte border-2 border-trait-discret p-5 hover:border-prune"
                      >
                        <span className="text-lg font-bold">{p.name}</span>
                        <span className="ml-auto text-lg font-bold">
                          {formatEuros(p.price_cents)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : q.etape === 'sejour' ? (
        /* A5 : la cliente sera sur place. L'adresse de séjour remplace la sienne. */
        <EtapeSejour proId={pro.id} prestation={prestation} recherche={q} lien={lien} />
      ) : modePro !== 'fixe' && (!q.a || !q.cp) ? (
        /* Étape 2 : l'adresse. Absente en mode fixe (D10 ①). */
        <>
          <h1 className="display mt-6 tracking-tight">{C.$aEcrire.adresseTitre}</h1>
          <p className="mt-3 text-texte-secondaire">
            {remplir(C.$aEcrire.adresseAide, { pro: prenom })}
          </p>
          <form method="get" className="mt-8">
            <input type="hidden" name="p" value={prestation.id} />
            {/*
              B12 : les résultats arrivent au fil de la frappe, et remplissent
              les trois champs d'un coup. Une adresse pénible à saisir est une
              réservation perdue, et c'est ici que le tunnel bascule.
            */}
            <ChampAdresse
              id="adresse"
              label="Votre adresse"
              placeholder="12 rue des Lilas, Pau"
              aide="Tapez les premiers caractères, les propositions arrivent toutes seules."
              defaut={{ ligne: q.a, codePostal: q.cp, ville: q.v }}
            />
            <button
              type="submit"
              className="tactile mt-8 w-full rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
            >
              Voir les créneaux
            </button>
          </form>
        </>
      ) : !q.c ? (
        /* Étape 3 : le créneau. */
        <EtapeCreneaux
          proId={pro.id}
          prenom={prenom}
          pronom={pro.pronoun}
          modePro={modePro}
          prestation={prestation}
          recherche={q}
          lien={lien}
        />
      ) : prestation.photos_required && !q.ph ? (
        /*
          Étape 4 : les photos, envoyées avant et non avec la réservation.

          A4 — elle n'existe QUE si la prestation le demande. Imposer les photos
          partout fait abandonner des réservations simples ; ne les imposer
          nulle part laisse arriver des prestations mal qualifiées. C'est la pro
          qui coche, prestation par prestation.
        */
        <FormPhotos prenomPro={prenom} chemin={chemin} parametres={parametres} />
      ) : (
        /* Étape 5 : les coordonnées, puis la célébration. */
        <>
          <h1 className="display mt-6 tracking-tight">{C.$aEcrire.coordonneesTitre}</h1>
          <p className="mt-3 text-texte-secondaire">
            {canal === 'sms'
              ? C.rappel.coordonneesAideSms
              : remplir(C.rappel.coordonneesAideEmail, { pro: prenom })}
          </p>
          <p className="mt-1 text-texte-attenue">
            {prestation.name}, {jourFr.format(new Date(q.c))} à {heureFr.format(new Date(q.c))}.
          </p>
          {q.sr ? <BandeauSousReserve /> : null}
          <div className="mt-8">
            <FormCoordonnees
              proId={pro.id}
              serviceId={prestation.id}
              debut={q.c}
              adresse={q.a ?? ''}
              codePostal={q.cp ?? ''}
              ville={q.v ?? ''}
              depotPhotos={q.d ?? ''}
              canal={canal}
              horsZone={Boolean(q.sr)}
              sejourDu={q.du ?? ''}
              sejourAu={q.au ?? ''}
              prenomPro={prenom}
              acceptation={<BlocAcceptation point="reservation_cliente" />}
            />
          </div>
        </>
      )}
    </main>
  )
}

function BandeauSousReserve() {
  return (
    <p className="mt-6 rounded-carte bg-attente/25 px-5 py-4 font-semibold">
      {C.sousReserve.badge}
    </p>
  )
}

async function EtapeCreneaux({
  proId,
  prenom,
  pronom,
  modePro,
  prestation,
  recherche,
  lien,
}: {
  proId: string
  prenom: string
  pronom: string | null
  modePro: 'itinerant' | 'fixe'
  prestation: { id: string; name: string }
  recherche: Recherche
  lien: (ajouts: Recherche) => string
}) {
  /*
    E3 ③ — l'entonnoir de réservation, étape par étape.

    Sous identifiant de session ÉPHÉMÈRE, jamais rattaché à un compte ni à une
    identité : il ne relie que les étapes d'une même visite, ce qui est
    exactement ce que l'entonnoir demande, et rien de plus. On mesure l'ARRIVÉE
    sur l'étape ; l'abandon se déduit de l'absence de l'étape suivante, ce qui
    évite d'avoir à guetter un départ qu'on ne peut de toute façon pas observer.
  */
  await mesurerVisite('tunnel_etape', { etape: 'creneaux' })

  const resultat = await creneauxProposables({
    proId,
    serviceId: prestation.id,
    adresse: { ligne1: recherche.a ?? '', codePostal: recherche.cp, ville: recherche.v },
    modePro,
    accepterHorsZone: Boolean(recherche.sr),
  })

  // Adresse non reconnue : on propose une correction plutôt qu'un mur. Une
  // cliente qui a mal tapé sa rue ne doit pas abandonner ici.
  if (resultat.statut === 'adresse-a-preciser') {
    // L'abandon à l'étape ADRESSE est la question ③ nommée par la roadmap :
    // c'est là que le tunnel perd le plus, et on veut savoir si c'est le
    // géocodage qui décroche.
    await mesurerVisite('tunnel_etape', { etape: 'adresse', issue: 'non_reconnue' })
    return (
      <>
        <h1 className="display mt-6 tracking-tight">{C.$aEcrire.adresseIntrouvable}</h1>
        {resultat.suggestions.length > 0 ? (
          <>
            <p className="mt-6 font-semibold">{C.$aEcrire.adressePreciser}</p>
            <ul className="mt-4 space-y-2">
              {resultat.suggestions.map((s) => (
                <li key={s.libelle}>
                  <Link
                    href={lien({ a: s.libelle, cp: s.codePostal ?? '', v: s.ville ?? '' })}
                    className="block rounded-carte border-2 border-trait-discret p-4 hover:border-prune"
                  >
                    {s.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-6 text-texte-secondaire">{C.$aEcrire.adresseAucuneSuggestion}</p>
        )}
        <Link
          href={lien({ a: '', cp: '', v: '' })}
          className="tactile mt-8 inline-flex font-semibold text-action"
        >
          Saisir une autre adresse
        </Link>
      </>
    )
  }

  // A5 / A6 : hors zone. Deux portes, aucune impasse.
  if (resultat.statut === 'hors-zone') {
    return (
      <>
        <h1 className="display mt-6 tracking-tight">
          {remplir(C.$aEcrire.horsZoneTitre, { pro: prenom })}
        </h1>
        <p className="mt-3 text-texte-attenue">
          {resultat.adresse.libelle}
          {resultat.distanceKm !== null && resultat.repere
            ? `, à ${formatDistance(resultat.distanceKm)} de ${resultat.repere}`
            : ''}
        </p>
        <p className="mt-6 text-lg">
          {pronom
            ? remplir(C.$aEcrire.horsZoneDemande, { pro: prenom, pronom })
            : C.$aEcrire.horsZoneDemandeSansPronom}
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href={lien({ sr: '1' })}
            className="tactile flex w-full items-center justify-center rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
          >
            {C.sousReserve.bouton}
          </Link>
          <Link
            href={lien({ etape: 'sejour' })}
            className="tactile flex w-full items-center justify-center rounded-pilule border-2 border-trait-discret px-8 text-lg font-semibold hover:border-prune"
          >
            {C.$aEcrire.sejourTitre}
          </Link>
        </div>
        <Link
          href={lien({ a: '', cp: '', v: '' })}
          className="tactile mt-6 inline-flex font-semibold text-action"
        >
          Saisir une autre adresse
        </Link>
      </>
    )
  }

  if (resultat.statut !== 'ok' || resultat.jours.length === 0) {
    return (
      <>
        <h1 className="display mt-6 tracking-tight">
          {remplir(C.gabarits.aucunCreneauTitre, { pro: prenom })}
        </h1>
        <p className="mt-4 text-texte-secondaire">{C.aucunCreneau.invitation}</p>
      </>
    )
  }

  return (
    <>
      <h1 className="display mt-6 tracking-tight">
        {remplir(C.gabarits.creneauxTitre, { pro: prenom })}
      </h1>
      {resultat.adresse ? (
        <p className="mt-3 text-texte-attenue">{resultat.adresse.libelle}</p>
      ) : null}
      {resultat.horsZone ? <BandeauSousReserve /> : null}

      <DeuxEtages jours={resultat.jours} prenom={prenom} lien={lien} />
    </>
  )
}

/**
 * A12 — l'affichage à deux étages. Planche 15b, écran « 3 · CRÉNEAUX ».
 *
 * ⚠️ **LA RÈGLE D'OR : aucun créneau ne disparaît.** Le second étage contient
 * TOUT le faisable, en ordre chronologique, et il est à un clic. Ce composant
 * change la mise en avant, jamais le périmètre de ce qui est réservable : une
 * cliente qui n'est libre que mardi à midi réserve mardi à midi, sans friction
 * et sans avertissement culpabilisant.
 *
 * **Le premier étage est une liste PLATE, toutes journées confondues** — la
 * planche montre bien « Mar 12 · 14:30 » et « Jeu 14 · 10:00 » côte à côte.
 * C'est ce qui en fait une recommandation et non un agenda : on répond à
 * « quand passe-t-elle par chez moi ? », pas à « que reste-t-il mardi ? ».
 *
 * `<details>` plutôt qu'un état React : le second étage s'ouvre **sans
 * JavaScript**, reste accessible au clavier et aux lecteurs d'écran, et l'écran
 * demeure un composant serveur. Une cliente sur un réseau qui traîne doit
 * pouvoir dérouler la liste avant que le moindre script soit arrivé.
 */
function DeuxEtages({
  jours,
  prenom,
  lien,
}: {
  jours: { jour: Date; creneaux: { debut: Date; score: number }[] }[]
  prenom: string
  lien: (ajouts: Recherche) => string
}) {
  const tous = jours.flatMap((j) => j.creneaux)
  const { recommandes } = repartirEnEtages(tous)
  const misEnAvant = new Set(recommandes.map((c) => c.debut.getTime()))

  return (
    <>
      {recommandes.length > 0 ? (
        <section className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {recommandes.map((creneau) => (
              <li key={creneau.debut.toISOString()}>
                <Link
                  href={lien({ c: creneau.debut.toISOString() })}
                  className="tactile rounded-pilule bg-surface px-4 text-[13px] font-semibold shadow-carte hover:text-action"
                >
                  {jourCourtFr.format(creneau.debut)} · {heureFr.format(creneau.debut)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-texte-attenue">
            {remplir(C.$aEcrire.creneauxProchesLegende, { pro: prenom })}
          </p>
        </section>
      ) : null}

      {/*
        Ouvert d'office quand rien ne se distingue : afficher « Aucun ne
        convient ? » au-dessus d'une liste fermée qui est la SEULE liste serait
        une porte close devant une pièce vide.
      */}
      <details className="group mt-8" open={recommandes.length === 0}>
        {/*
          ⚠️ Pas de `tactile` sur le `summary` : cette classe le rendrait
          `inline-flex`, et la question passerait À CÔTÉ du bouton au lieu de
          se poser au-dessus. La planche les empile. La zone de 44 px vit sur le
          bouton, qui est ce que le doigt vise.
        */}
        <summary className="cursor-pointer list-none border-t border-trait-discret pt-4 [&::-webkit-details-marker]:hidden">
          <span className="block text-[12px] font-bold">{C.$aEcrire.creneauxAucunNeConvient}</span>
          <span className="tactile mt-2 w-full rounded-pilule border-[1.5px] border-trait-discret bg-surface px-4 text-center text-[12.5px] font-bold group-open:hidden">
            {C.$aEcrire.creneauxToutVoir}
          </span>
        </summary>

        <div className="mt-4 space-y-8">
          {jours.map((jour) => (
            <section key={jour.jour.toISOString()}>
              <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
                {jourFr.format(jour.jour)}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {jour.creneaux.map((creneau) => (
                  <li key={creneau.debut.toISOString()}>
                    <Link
                      href={lien({ c: creneau.debut.toISOString() })}
                      className={`tactile rounded-pilule border-2 px-5 font-semibold ${
                        misEnAvant.has(creneau.debut.getTime())
                          ? 'border-action/40'
                          : 'border-trait-discret hover:border-prune'
                      }`}
                    >
                      {heureFr.format(creneau.debut)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </details>
    </>
  )
}

/**
 * A5 : la cliente séjourne dans la zone. C'est l'adresse du séjour qui compte
 * pour le moteur géo, et les dates disent au pro de quoi il s'agit.
 *
 * La recherche d'hôtels dépend d'une API facultative : sans elle, la cliente
 * saisit l'adresse à la main et voit les communes desservies. Le parcours
 * fonctionne dans les deux cas.
 */
async function EtapeSejour({
  proId,
  prestation,
  recherche,
  lien,
}: {
  proId: string
  prestation: { id: string }
  recherche: Recherche
  lien: (ajouts: Recherche) => string
}) {
  const supabase = await supabaseServer()
  const { data: communes } = await supabase
    .from('service_area_communes')
    .select('name, lat, lng')
    .eq('pro_id', proId)
    .order('name')

  const repere = (communes ?? []).find((c) => c.lat !== null && c.lng !== null)
  const hebergements =
    recherche.h && repere?.lat != null && repere.lng != null
      ? await chercherHebergements(recherche.h, { lat: repere.lat, lng: repere.lng })
      : null

  return (
    <>
      <h1 className="display mt-6 tracking-tight">{C.$aEcrire.sejourTitre}</h1>
      <p className="mt-3 text-texte-secondaire">{C.$aEcrire.sejourAide}</p>
      {(communes ?? []).length > 0 ? (
        <p className="mt-2 text-texte-attenue">
          {C.$aEcrire.zoneIntervention} {(communes ?? []).map((c) => c.name).join(', ')}
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
          {C.$aEcrire.sejourHotel}
        </h2>
        <p className="mt-2 text-texte-secondaire">{C.$aEcrire.sejourHotelAide}</p>
        <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="p" value={prestation.id} />
          <input type="hidden" name="etape" value="sejour" />
          <label htmlFor="h" className="sr-only">
            {C.$aEcrire.sejourHotel}
          </label>
          <input
            id="h"
            name="h"
            defaultValue={recherche.h ?? ''}
            className="w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
          />
          <button
            type="submit"
            className="rounded-pilule bg-prune px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-prune-survol"
          >
            Chercher
          </button>
        </form>
        {hebergements && hebergements.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {hebergements.map((h) => (
              <li key={`${h.nom}-${h.adresse}`}>
                <Link
                  href={lien({ etape: '', h: '', a: h.adresse, cp: '', v: '' })}
                  className="block rounded-carte border-2 border-trait-discret p-4 hover:border-prune"
                >
                  <span className="font-semibold">{h.nom}</span>
                  <span className="block text-texte-secondaire">{h.adresse}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-10 border-t border-trait-discret pt-8">
        <h2 className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
          {C.$aEcrire.sejourAdresseConnue}
        </h2>
        {/*
          Les trois champs d'adresse s'ouvrent VIDES, à dessein. Les préremplir
          avec l'adresse de l'étape précédente, celle qui vient d'être jugée
          hors zone, invite à valider sans relire : la cliente déclarerait comme
          lieu de séjour l'adresse dont elle vient de dire que ce n'était pas le
          bon lieu, et le pro se déplacerait au mauvais endroit (R2-6). Par
          définition ce n'est pas le même lieu, sinon la question ne se poserait
          pas. La prestation, elle, reste conservée.
        */}
        <form method="get" className="mt-4">
          <input type="hidden" name="p" value={prestation.id} />
          <ChampAdresse
            id="sejour"
            label="Adresse du séjour"
            placeholder="Hôtel, location, chez des proches"
          />
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
            <ChampGet id="du" label={C.$aEcrire.sejourDu} defaultValue={recherche.du} type="date" />
            <ChampGet id="au" label={C.$aEcrire.sejourAu} defaultValue={recherche.au} type="date" />
          </div>
          <button
            type="submit"
            className="tactile mt-8 w-full rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
          >
            Voir les créneaux
          </button>
        </form>
      </section>
    </>
  )
}

/** B13 — les prestations par famille. Une seule liste quand rien n'est rangé. */
function parFamille<T extends { category: string | null }>(
  prestations: T[],
): [string | null, T[]][] {
  const familles = new Map<string | null, T[]>()
  for (const p of prestations) {
    const cle = p.category ?? null
    familles.set(cle, [...(familles.get(cle) ?? []), p])
  }
  return [...familles.entries()].sort(([a], [b]) =>
    a === null ? 1 : b === null ? -1 : a.localeCompare(b),
  )
}
