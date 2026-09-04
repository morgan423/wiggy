import Link from 'next/link'
import {
  ZONE,
  debutDeJour,
  ajouterJours,
  instantVersHeureLocale,
  formatDistance,
  formatEuros,
  lienGps,
  estAppGps,
  minutesAvantDepart,
  rappelDeDepartPertinent,
  libelleTrajet,
  memeSecteur,
  fenetreDeReprise,
  rythmeDeRetourSemaines,
  etatRendezVous,
  finDeJournee,
  lancementProposable,
  aRelancer,
  type AppGps,
  type EtatRendezVous,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requireCapability } from '@/lib/auth'
import { mesurerPro } from '@/lib/telemetrie'
import { supabaseServer } from '@/lib/supabase/server'
import { trajetsDeLaJournee, type Trajets } from '@/lib/tournee'
import { FormRetard } from './retard'
import { journeeEstLancee, departDuJour } from '@/lib/journee'
import { LienGps } from './lien-gps'
import { Lancement } from './lancement'
import { IconesEntete } from '@/components/icones-entete'
import { EnteteEcran, CorpsEcran, RANGEE, RANGEE_ACTIVABLE } from '@/components/composition'

/**
 * C0, « Ma tournée » : le copilote du jour. Planche 16d.
 *
 * Trois états, et la planche les distingue nettement.
 *
 * ① EN TOURNÉE : le bandeau prune porte le statement, l'avancement en toutes
 * lettres, et le FIL DE PASTILLES qui est le motif trajet de la planche 8a.
 * Dessous, une seule carte détachée par une bordure framboise, celle du
 * prochain rendez-vous, avec ses deux actions ; les suivants suivent en
 * rangées atténuées.
 * ② JOURNÉE BOUCLÉE : le fil entièrement en miel, le statement de célébration
 * et le bilan réel du jour. Jamais d'estimation.
 * ③ JOUR OFF : ni CTA de remplissage ni culpabilisation. Un jour off n'est pas
 * un état d'échec.
 *
 * Distinct de l'agenda (B10) : là c'est la planification, ici c'est le jour
 * vécu. Gaté sur `tour_copilot` (offre 2), vérifié côté serveur.
 *
 * Ce qui n'est pas là et ne s'invente pas : la clôture en un tap (B6) et le SMS
 * « je suis en retard » (C5) appartiennent à la phase 2. L'état d'un
 * rendez-vous se déduit donc de l'heure, pas d'un geste du pro.
 */

const T = copy.agendaTournee
const V = copy.etatsVides

const heure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
const jourSeul = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, weekday: 'long' })

export default async function MaTournee({
  searchParams,
}: {
  searchParams: Promise<{ le?: string; vient_de?: string }>
}) {
  const { pro } = await requireCapability('tour_copilot')

  /*
    E3 ⑧ — la consultation de « Ma tournée ». C'est l'écran dont C9 promet
    qu'il survit à la zone blanche : savoir s'il est REGARDÉ décide si le
    hors-ligne valait la peine. Rien du contenu de la journée n'est mesuré,
    juste le fait qu'elle a été ouverte.
  */
  await mesurerPro('usage_app', pro.id, { action: 'tournee_ouverte' })
  const { le, vient_de: vientDe } = await searchParams

  const jour = debutDeJour(ancreValide(le))
  const finJour = ajouterJours(jour, 1)
  const maintenant = new Date()

  const supabase = await supabaseServer()
  const { data: rdvs } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, ends_at, service_name, price_cents, status, address_line1, city, lat, lng, client_id, clients(first_name, last_name)',
    )
    .gte('starts_at', jour.toISOString())
    .lt('starts_at', finJour.toISOString())
    .not('status', 'eq', 'cancelled')
    .order('starts_at')

  const journee = rdvs ?? []

  /*
    D16 — le point de départ, étape ZÉRO de la journée.

    Sans lui, le calcul commençait à la deuxième étape : le premier rendez-vous
    n'avait aucun trajet amont, et le rappel de départ ne fonctionnait jamais le
    matin, au moment où il sert le plus.

    ⚠️ Cette adresse n'est jamais exposée publiquement : c'est le domicile de la
    pro dans la plupart des cas (principe n°6).
  */
  const { data: pointDepart } = await supabase
    .from('pros')
    .select('start_line1, start_lat, start_lng')
    .eq('id', pro.id)
    .maybeSingle()
  // La position du jour, quand la pro l'a confirmée au lancement, prime sur
  // l'adresse enregistrée : c'est de là qu'elle part aujourd'hui.
  const duJour = await departDuJour(instantVersHeureLocale(jour).slice(0, 10))
  const depart =
    duJour ??
    (pointDepart?.start_lat != null && pointDepart.start_lng != null
      ? { lat: pointDepart.start_lat, lng: pointDepart.start_lng }
      : null)

  const trajets: Trajets = await trajetsDeLaJournee(journee, depart)

  // C3 : l'application de navigation que la pro utilise déjà, réglée une fois.
  // C7 : la reprise du prochain rendez-vous, à la clôture. C'est LE geste
  // métier réel : la coiffeuse recale presque toujours pendant que la cliente
  // est encore là. On calcule la fenêtre d'après SON rythme, et quand le rythme
  // ne dit rien (moins de trois visites), on propose sans fenêtre plutôt que
  // d'inventer une régularité.
  const reprise = vientDe ? await repriseApresCloture(supabase, vientDe) : null

  const journeeLancee = await journeeEstLancee(supabase, pro.id, jour)
  const jourCivil = instantVersHeureLocale(jour).slice(0, 10)

  /*
    D15, le piège à ne pas laisser ouvert : un rendez-vous non clôturé d'un jour
    précédent disparaîtrait dans le passé. L'apprentissage des durées ne se
    ferait jamais et les fiches resteraient vides. On les compte, et on y mène.

    L'app cesse d'insister au bout de sept jours. Elle ne clôture jamais pour
    autant : on propose, on ne harcèle pas.
  */
  const { data: ouverts } = await supabase
    .from('appointments')
    .select('id, ends_at, status')
    // Le soir, la page du jour EST l'écran de rattrapage : ce qui reste à
    // clôturer aujourd'hui compte ici, pas seulement les jours précédents.
    .lt('ends_at', maintenant.toISOString())
    .not('status', 'in', '(done,cancelled)')
    .order('starts_at', { ascending: false })
    .limit(50)
  const aCloturer = aRelancer(
    (ouverts ?? []).map((r) => ({ id: r.id, cloture: false, fin: new Date(r.ends_at) })),
    maintenant,
  )

  /*
    D15 — la page ne connaissait que les heures des rendez-vous, jamais celle de
    la fermeture. `working_hours` la porte depuis la première migration, et
    c'est cet oubli qui faisait proposer « commencer ma tournée » à 23 h sur une
    journée finie depuis cinq heures.

    `weekday` suit la convention du schéma : 0 = lundi.
  */
  const jourDeSemaine = (jour.getUTCDay() + 6) % 7
  const { data: fermetures } = await supabase
    .from('working_hours')
    .select('ends_at')
    .eq('pro_id', pro.id)
    .eq('weekday', jourDeSemaine)
  const finJournee = finDeJournee(
    jour,
    (fermetures ?? []).map((h) => h.ends_at),
  )

  const [{ data: reglages }, { data: fiche }] = await Promise.all([
    supabase.from('pro_settings').select('gps_app').eq('pro_id', pro.id).maybeSingle(),
    // G4 : le message de retard appelle une réponse, il porte donc le numéro
    // de la pro. Un sender ID alphanumérique ne se répond pas.
    supabase.from('pros').select('phone').eq('id', pro.id).maybeSingle(),
  ])
  const gpsChoisi = reglages?.gps_app ?? ''
  const appGps: AppGps = estAppGps(gpsChoisi) ? gpsChoisi : 'system'

  /*
    D15 — l'état se déduit de ce que la pro a FAIT, jamais de l'horloge.
    L'ancien code marquait « Terminé » tout rendez-vous dont l'heure était
    passée : l'interface mentait, et B6 n'apprenait rien puisqu'aucune clôture
    n'avait eu lieu. Le calcul vit désormais dans le domaine, partagé avec
    l'agenda : deux écrans ne peuvent plus dire deux choses du même
    rendez-vous.
  */
  const etatDe = (r: (typeof journee)[number]): EtatRendezVous =>
    etatRendezVous({
      cloture: r.status === 'done',
      debut: new Date(r.starts_at),
      fin: new Date(r.ends_at),
      journeeLancee,
      maintenant,
    })

  const restants = journee.filter((r) => etatDe(r) !== 'termine')
  const faits = journee.length - restants.length
  // Le « prochain » est le prochain à VIVRE : un rendez-vous à clôturer est
  // derrière soi, il n'ouvre pas la carte de tête.
  const aVivre = restants.filter((r) => etatDe(r) !== 'a-cloturer')
  const prochain = aVivre.length > 0 ? aVivre[0] : null
  const bouclee = journee.length > 0 && restants.length === 0

  const veille = instantVersHeureLocale(ajouterJours(jour, -1)).slice(0, 10)
  const lendemain = instantVersHeureLocale(ajouterJours(jour, 1)).slice(0, 10)
  const prenom = pro.display_name.split(' ')[0]

  return (
    <>
      {/*
        Journée bouclée : la planche retire le bandeau prune. La célébration
        occupe l'écran, elle ne partage pas la tête avec un résumé.
      */}
      {bouclee ? null : (
        <EnteteEcran
          variante="jour"
          cloche={<IconesEntete />}
          statement={remplir(T.tournee.statement, { pro: prenom })}
          sousTitre={
            prochain
              ? remplir(T.gabarits.progression, {
                  faits: String(faits),
                  total: String(journee.length),
                  cliente: nomDe(prochain.clients),
                  heure: heure.format(new Date(prochain.starts_at)),
                })
              : undefined
          }
        >
          {journee.length > 0 ? <FilTrajet journee={journee.map(etatDe)} /> : null}
        </EnteteEcran>
      )}

      <CorpsEcran serre>
        {aCloturer.length > 0 ? (
          <Link
            href="/app/tournee/a-cloturer"
            className="flex items-center justify-between gap-2.5 rounded-carte bg-attente px-3.5 py-3 hover:opacity-90"
          >
            <span className="text-[13px] font-bold">
              {remplir(T.$aEcrire.aCloturerCompte, { n: String(aCloturer.length) })}
            </span>
            <span aria-hidden className="shrink-0 text-[14px]">
              ›
            </span>
          </Link>
        ) : null}

        {/* D15 : sans lancement, rien n'est « en cours ». Le bouton est l'un
            des deux gestes qui lancent ; l'autre est l'ouverture du GPS. */}
        {lancementProposable({
          journeeLancee,
          aDesRendezVous: journee.length > 0,
          unEnCours: journee.some((r) => etatDe(r) === 'en-cours'),
          maintenant,
          finJournee,
        }) ? (
          <>
            <Lancement jour={jourCivil} depart={pointDepart?.start_line1 ?? null} />
            <p className="text-center text-[11.5px] text-texte-attenue">{T.$aEcrire.lancerAide}</p>
            {/* D16 : sans point de départ, le premier rendez-vous n'a ni trajet
                ni rappel. On le dit ici, au moment où ça compte, et on mène au
                réglage. */}
            {!depart ? (
              <p className="text-center text-[11.5px] text-texte-attenue">
                {T.$aEcrire.departManquant}{' '}
                <Link href="/app/parametrage/profil" className="font-bold underline">
                  {T.$aEcrire.departTitre}
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {/* C2 : au retour d'une clôture, la première chose à savoir est où l'on
            va maintenant. On le NOMME, plutôt que de laisser chercher. */}
        {vientDe && prochain ? (
          <p className="rounded-champ bg-prune px-3.5 py-2.5 text-[12.5px] font-bold text-texte-sur-plein">
            {remplir(T.$aEcrire.prochainRdv, {
              cliente: nomDe(prochain.clients),
              heure: heure.format(new Date(prochain.starts_at)),
              adresse: prochain.address_line1 ?? prochain.city ?? '',
            })}
          </p>
        ) : null}
        {vientDe && !prochain && !bouclee ? (
          <p className="text-[12.5px] text-texte-attenue">{T.$aEcrire.aucunProchain}</p>
        ) : null}

        {/* C7 : « On cale le prochain ? », en un tap, même prestation. */}
        {reprise ? (
          <Link
            href={reprise.lien}
            className={`flex flex-col gap-1 rounded-carte border-2 border-action bg-surface px-3.5 py-3 ${RANGEE_ACTIVABLE}`}
          >
            <span className="text-[13.5px] font-bold">{T.$aEcrire.caler}</span>
            <span className="text-[11.5px] text-texte-attenue">{T.$aEcrire.calerAide}</span>
          </Link>
        ) : null}

        {journee.length === 0 ? (
          <JourSansRdv jour={jour} lendemain={lendemain} />
        ) : (
          <>
            {bouclee ? <Bouclee journee={journee} trajets={trajets} /> : null}

            {prochain ? (
              <ProchainRdv
                rdv={prochain}
                trajets={trajets}
                appGps={appGps}
                prenomPro={prenom}
                telephonePro={fiche?.phone ?? null}
                jour={jourCivil}
                journeeLancee={journeeLancee}
              />
            ) : null}

            {/*
              D15 — L'HISTORIQUE DE LA JOURNÉE NE DISPARAÎT JAMAIS. Quelle que
              soit l'heure, et que la journée ait été lancée ou non, chaque
              rendez-vous du jour reste là avec son état réel.

              À 23 h, cette liste EST l'écran de rattrapage : c'est sur la page
              du jour que la pro revient, pas sur la date suivante. Avant, la
              journée écoulée disparaissait au profit d'un bouton de lancement,
              et il fallait naviguer vers le LENDEMAIN pour voir ce qui restait
              à clôturer.
            */}
            <ul className="flex flex-col gap-2">
              {journee.map((r) =>
                prochain?.id === r.id ? null : (
                  <li key={r.id}>
                    <Link
                      href={`/app/agenda/${r.id}`}
                      className={`${RANGEE} gap-2.5 rounded-[14px] px-3.5 py-[11px] ${RANGEE_ACTIVABLE} ${
                        etatDe(r) === 'termine' ? 'opacity-70' : ''
                      }`}
                    >
                      <span className="w-[42px] shrink-0 text-[12.5px] font-extrabold">
                        {heure.format(new Date(r.starts_at))}
                      </span>
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold">
                        {nomDe(r.clients)}
                        {r.city ? ` · ${r.city}` : ''}
                      </span>
                      <EtatDuJour etat={etatDe(r)} />
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </>
        )}

        {/* Les flèches de jour ne sont pas sur la planche : le copilote parle
            d'aujourd'hui. Elles restent, en pied et en petit, parce que
            regarder la veille ou le lendemain est un besoin réel. */}
        <nav className="flex justify-between pt-2 text-[12px] font-bold text-texte-attenue">
          <Link href={`/app/tournee?le=${veille}`} className="hover:text-prune">
            ‹ Veille
          </Link>
          <Link href={`/app/tournee?le=${lendemain}`} className="hover:text-prune">
            Lendemain ›
          </Link>
        </nav>
      </CorpsEcran>
    </>
  )
}

/**
 * Le fil de pastilles : le motif trajet de la planche 8a, porté en avancement.
 *
 * Fait en miel plein, en cours en anneau abricot, à venir en anneau doux ; le
 * segment qui reste à parcourir est pointillé, celui qui l'est déjà est plein.
 * C'est la seule figure de la planche qui dit d'un coup d'œil où en est la
 * journée.
 */
function FilTrajet({ journee }: { journee: EtatRendezVous[] }) {
  return (
    <span aria-hidden className="flex items-center pt-1.5">
      {journee.map((etat, i) => (
        <span key={i} className="flex items-center">
          {i > 0 ? (
            <span
              className={`h-[2.5px] w-[30px] ${
                journee[i - 1] === 'termine' ? 'bg-celebration' : 'trait-pointille'
              }`}
            />
          ) : null}
          <span
            className={`size-3 rounded-pilule ${
              etat === 'termine'
                ? 'bg-celebration'
                : etat === 'en-cours'
                  ? 'border-[2.5px] border-attente'
                  : etat === 'a-cloturer'
                    ? 'border-[2.5px] border-attente opacity-60'
                    : 'border-[2.5px] border-texte-sur-plein-doux'
            }`}
          />
        </span>
      ))}
    </span>
  )
}

/**
 * La carte du prochain rendez-vous : la seule de l'écran à porter une bordure
 * framboise. C'est la question à laquelle le pro vient chercher une réponse,
 * il ne doit pas la chercher.
 */
function ProchainRdv({
  rdv,
  trajets,
  appGps,
  prenomPro,
  telephonePro,
  jour,
  journeeLancee,
}: {
  rdv: {
    id: string
    starts_at: string
    service_name: string
    address_line1: string | null
    city: string | null
    lat: number | null
    lng: number | null
    clients: unknown
  }
  trajets: Trajets
  appGps: AppGps
  prenomPro: string
  telephonePro: string | null
  /** Le jour civil du rendez-vous, pour lancer la bonne journée. */
  jour: string
  journeeLancee: boolean
}) {
  const trajet = trajets.get(rdv.id)
  const lieu = [rdv.address_line1, rdv.city].filter(Boolean).join(', ')
  const maintenant = new Date()
  const debut = new Date(rdv.starts_at)

  // C4 — quand PARTIR, jamais combien de temps il reste. « Il reste 25 minutes »
  // n'aide personne quand la route en prend 30.
  const minutesAvant = trajet
    ? minutesAvantDepart({ debutRdv: debut, minutesTrajet: trajet.minutes, maintenant })
    : null
  const departPertinent =
    minutesAvant !== null && trajet ? rappelDeDepartPertinent(minutesAvant, trajet.minutes) : false

  return (
    <div className="flex flex-col gap-2 rounded-carte border-2 border-action bg-surface px-3.5 py-[13px]">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[13.5px] font-bold">
          {nomDe(rdv.clients)} · {heure.format(new Date(rdv.starts_at))}
        </span>
        {/* D16 : deux points confondus ne s'annoncent pas en minutes seules.
            La marge D5 est DANS le chiffre : c'est celui qui décale l'agenda. */}
        {trajet ? (
          <span className="shrink-0 text-[11.5px] font-bold text-texte-secondaire">
            {memeSecteur(trajet.km)
              ? libelleTrajet(trajet)
              : remplir(T.gabarits.route, { min: String(trajet.minutes) })}
          </span>
        ) : null}
      </div>
      <p className="text-[12px] text-texte-attenue">
        {rdv.service_name}
        {lieu ? ` · ${lieu}` : ` · ${T.$aEcrire.sansAdresse}`}
      </p>
      {/* C4 : le rappel de départ, lié au trajet réel. Il ne parle que dans sa
          fenêtre : trop tôt il devient du bruit qu'on apprend à ignorer. */}
      {departPertinent && minutesAvant !== null ? (
        <p className="rounded-champ bg-celebration px-3 py-2 text-[12.5px] font-bold text-texte-sur-miel">
          {minutesAvant > 0
            ? remplir(T.$aEcrire.departDans, {
                min: String(minutesAvant),
                cliente: nomDe(rdv.clients),
              })
            : minutesAvant === 0
              ? remplir(T.$aEcrire.departMaintenant, { cliente: nomDe(rdv.clients) })
              : remplir(T.$aEcrire.departEnRetard, {
                  min: String(-minutesAvant),
                  cliente: nomDe(rdv.clients),
                })}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {/* C3 : un tap ouvre l'application que la pro utilise déjà. Aucune
            navigation embarquée, jamais : c'est une règle de la ligne. */}
        {rdv.lat !== null && rdv.lng !== null ? (
          <LienGps
            href={lienGps(appGps, { lat: rdv.lat, lng: rdv.lng }, nomDe(rdv.clients))}
            jour={jour}
            dejaLancee={journeeLancee}
          >
            {T.tournee.gps}
          </LienGps>
        ) : null}
        {/* C5 : il n'a de sens qu'une fois la journée lancée. Annoncer un
            retard sans être partie n'annonce rien. Et le message se
            prévisualise et se valide : il ne part jamais seul. */}
        {journeeLancee ? (
          <FormRetard
            id={rdv.id}
            cliente={nomDe(rdv.clients)}
            prenomPro={prenomPro}
            telephonePro={telephonePro}
            minutesTrajet={trajet?.minutes ?? null}
          />
        ) : null}
        <Link
          href={`/app/agenda/${rdv.id}`}
          className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[13px] font-bold hover:border-prune"
        >
          {T.prochain.fiche}
        </Link>
      </div>
    </div>
  )
}

/**
 * La journée bouclée : la célébration 13b, une fois par jour au maximum.
 *
 * Le bilan reprend les compteurs RÉELS du jour. Aucune estimation : un chiffre
 * inventé dans une célébration est un mensonge que la pro croira.
 */
function Bouclee({ journee, trajets }: { journee: { price_cents: number }[]; trajets: Trajets }) {
  const km = [...trajets.values()].reduce((somme, t) => somme + t.km, 0)
  const encaisse = journee.reduce((somme, r) => somme + r.price_cents, 0)

  return (
    <div className="flex flex-col gap-2.5 py-2">
      <FilBoucle n={journee.length} />
      <h1 className="statement-ecran">{T.tournee.bouclee}</h1>
      <div className="flex justify-between rounded-carte bg-surface px-3.5 py-[13px] text-[12.5px] font-bold">
        <span>{remplir(T.gabarits.nRdv, { n: String(journee.length) })}</span>
        <span>{km > 0 ? formatDistance(km) : '0 km'}</span>
        <span>{formatEuros(encaisse)}</span>
      </div>
    </div>
  )
}

/** Le fil de la planche, entièrement en miel : tout est fait. */
function FilBoucle({ n }: { n: number }) {
  return (
    <span aria-hidden className="flex items-center px-0.5 py-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex items-center">
          {i > 0 ? <span className="h-[2.5px] w-[42px] bg-celebration" /> : null}
          <span className="size-3 rounded-pilule bg-celebration" />
        </span>
      ))}
    </span>
  )
}

/**
 * Le jour off. Pas de CTA de remplissage, pas de culpabilisation : la planche
 * est explicite, un jour sans rendez-vous n'est pas un échec.
 *
 * ⚠️ Écart signalé : la planche annonce la prochaine tournée (« jeudi, 2
 * rendez-vous à Rezé »). Il faudrait interroger les jours suivants pour
 * l'écrire sans mentir ; en attendant, on propose simplement d'aller voir le
 * lendemain plutôt que d'annoncer un chiffre qu'on n'a pas.
 */
function JourSansRdv({ jour, lendemain }: { jour: Date; lendemain: string }) {
  return (
    <div className="my-auto flex flex-col gap-2.5 py-6 text-center">
      <p className="text-[14px] font-bold">
        {remplir(T.gabarits.jourOff, { jour: jourSeul.format(jour) })}
      </p>
      <p className="text-[12.5px] leading-[1.5] text-texte-attenue">{V.agendaVide.invitation}</p>
      <Link
        href={`/app/tournee?le=${lendemain}`}
        className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[12.5px] font-bold hover:border-prune"
      >
        {T.$aEcrire.voirLendemain}
      </Link>
    </div>
  )
}

function nomDe(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Sans fiche'
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return 'Sans fiche'
  const nom = typeof c.last_name === 'string' ? c.last_name : ''
  return `${c.first_name} ${nom}`.trim()
}

/** N'accepte qu'une date « AAAA-MM-JJ » plausible ; sinon, aujourd'hui. */
function ancreValide(le: string | undefined): Date {
  if (!le || !/^\d{4}-\d{2}-\d{2}$/.test(le)) return new Date()
  const t = Date.parse(`${le}T12:00:00Z`)
  return Number.isNaN(t) ? new Date() : new Date(t)
}

/**
 * C7 — ce qu'il faut pour reproposer un rendez-vous à la cliente qu'on vient de
 * quitter.
 *
 * Le rythme vient de `fiche.ts` et ne se prononce pas avant trois visites. Sans
 * lui, on ouvre la création sans date suggérée : la pro choisira, et c'est très
 * bien. Ce qu'on ne fait pas, c'est proposer « dans cinq semaines » à quelqu'un
 * qu'on a vu deux fois.
 */
async function repriseApresCloture(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  rdvId: string,
): Promise<{ lien: string } | null> {
  const { data: rdv } = await supabase
    .from('appointments')
    .select('client_id, service_id, starts_at')
    .eq('id', rdvId)
    .maybeSingle()
  if (!rdv?.client_id || !rdv.service_id) return null

  const { data: historique } = await supabase
    .from('appointments')
    .select('starts_at, status')
    .eq('client_id', rdv.client_id)
  const visites = (historique ?? []).map((r) => ({
    debut: new Date(r.starts_at),
    annulee: r.status === 'cancelled',
  }))

  const fenetre = fenetreDeReprise({
    rythmeSemaines: rythmeDeRetourSemaines(visites),
    depuis: new Date(rdv.starts_at),
  })
  const params = new URLSearchParams({ cliente: rdv.client_id, prestation: rdv.service_id })
  if (fenetre) params.set('vers', instantVersHeureLocale(fenetre.debut).slice(0, 10))
  return { lien: `/app/agenda/nouveau?${params.toString()}` }
}

/** La pastille d'état dans la liste du jour. Quatre états, un seul automatique. */
function EtatDuJour({ etat }: { etat: EtatRendezVous }) {
  const commun = 'shrink-0 rounded-pilule px-2 py-1 text-[10px] font-extrabold whitespace-nowrap'
  switch (etat) {
    case 'termine':
      return (
        <span className={`${commun} bg-celebration text-texte-sur-miel`}>{T.etats.termine}</span>
      )
    case 'en-cours':
      return <span className={`${commun} bg-action text-texte-sur-plein`}>{T.etats.enCours}</span>
    case 'a-cloturer':
      return (
        <span className={`${commun} bg-attente text-texte-sur-miel`}>{T.$aEcrire.aCloturer}</span>
      )
    case 'a-venir':
      return <span className={`${commun} text-texte-attenue`}>{T.tournee.ensuite}</span>
  }
}
