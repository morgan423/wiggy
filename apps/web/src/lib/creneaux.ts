import {
  creneauxDuJour,
  plagesDuJour,
  joursOuvrables,
  can,
  dureeEstimeeMin,
  positionDansZone,
  type Creneau,
  type Point,
  type AdresseSaisie,
  type AdresseTrouvee,
  type SubscriptionState,
  type SuggestionAdresse,
  dureeApprise,
} from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { geocoder } from '@/lib/adresse'
import { zoneDuPro } from '@/lib/zone'
import { trajets } from '@/lib/trajets'

/**
 * A3 : les créneaux proposés à la cliente.
 *
 * Assemble ce que les autres modules savent faire : les plages du pro, ses
 * rendez-vous du jour, le géocodage de l'adresse, les temps de trajet réels,
 * et le moteur de créneaux. Aucune règle métier ici, seulement l'orchestration.
 *
 * Le géo-filtrage appartient à l'offre 2 (§2). Un pro en offre 1 propose des
 * créneaux simples : la vérification passe par `can()`, jamais par un test
 * d'égalité sur le palier écrit à la main.
 */

export type JourProposable = { jour: Date; creneaux: Creneau[] }

export type ResultatCreneaux =
  | {
      statut: 'ok'
      jours: JourProposable[]
      geoFiltre: boolean
      /**
       * L'adresse géocodée, à enregistrer telle quelle sur le rendez-vous.
       *
       * `null` en mode fixe (D10 ①) : aucune adresse cliente n'est collectée,
       * parce qu'il n'y a pas de finalité à la collecter. Minimisation RGPD,
       * pas confort d'écran.
       */
      adresse: AdresseTrouvee | null
      /** A6 : la cliente a demandé malgré le hors-zone. Le pro tranchera. */
      horsZone: boolean
    }
  // L'adresse n'a pas été reconnue : on remonte les candidats proches pour que
  // l'écran propose une correction plutôt qu'un refus sec.
  | { statut: 'adresse-a-preciser'; suggestions: SuggestionAdresse[] }
  // A5 / A6 : l'adresse est hors de la zone déclarée. Ce n'est pas un refus,
  // c'est un embranchement : séjour sur place, ou demande sous réserve.
  | {
      statut: 'hors-zone'
      adresse: AdresseTrouvee
      distanceKm: number | null
      repere: string | null
    }
  | { statut: 'indisponible' }

/** Horizon de proposition : deux semaines, comme un agenda de salon. */
const JOURS_PROPOSES = 14

export async function creneauxProposables(options: {
  proId: string
  serviceId: string
  adresse: AdresseSaisie
  /**
   * D10 ① — le mode d'exercice de la pro. En `fixe`, la cliente se déplace :
   * aucune adresse n'est demandée, aucun géocodage n'est fait, aucune zone
   * n'est vérifiée et aucun trajet n'est décompté. Ce n'est pas un cas
   * dégradé, c'est le calcul juste pour ce mode d'exercice.
   */
  modePro?: 'itinerant' | 'fixe'
  /**
   * A6 : la cliente a vu l'avertissement hors zone et demande quand même.
   * Sans ce drapeau, une adresse hors zone s'arrête à l'embranchement.
   */
  accepterHorsZone?: boolean
  maintenant?: Date
}): Promise<ResultatCreneaux> {
  if (!supabaseConfigured()) return { statut: 'indisponible' }
  const maintenant = options.maintenant ?? new Date()
  // Droits élargis, à dessein. Calculer une disponibilité suppose de lire
  // l'agenda du pro : ses horaires, ses rendez-vous, ses congés. Aucune de ces
  // tables n'a de politique anonyme, et c'est très bien ainsi.
  //
  // Ce qui sort d'ici ne contient que des créneaux libres : jamais un nom de
  // cliente, jamais une adresse, jamais l'existence d'un rendez-vous. La
  // cliente apprend qu'un horaire est pris, rien de plus.
  const supabase = supabaseAdmin()

  const [service, reglages, horaires, abonnement, apprentissage, depart] = await Promise.all([
    supabase
      .from('services')
      .select('duration_min')
      .eq('id', options.serviceId)
      .eq('pro_id', options.proId)
      .maybeSingle(),
    supabase
      .from('pro_settings')
      .select('new_client_buffer_min')
      .eq('pro_id', options.proId)
      .maybeSingle(),
    supabase
      .from('working_hours')
      .select('weekday, starts_at, ends_at')
      .eq('pro_id', options.proId),
    supabase.from('subscriptions').select('tier, status').eq('pro_id', options.proId).maybeSingle(),
    // B6 — l'apprentissage des durées. Ce que cette pro met RÉELLEMENT pour
    // cette prestation, mesuré à la clôture. Le niveau « cliente » n'est pas
    // interrogeable ici : dans le tunnel, on ne sait pas encore qui réserve.
    supabase
      .from('appointments')
      .select('actual_duration_min, duration_declared')
      .eq('pro_id', options.proId)
      .eq('service_id', options.serviceId)
      .not('actual_duration_min', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20),
    // D16 — le point de départ de la journée. A12 en a besoin pour noter le
    // premier et le dernier créneau, qui sinon paraîtraient gratuits alors
    // qu'ils sont justement ceux qui allongent la journée. Une lecture de
    // base de plus, aucun appel d'itinéraire de plus.
    supabase.from('pros').select('start_lat, start_lng').eq('id', options.proId).maybeSingle(),
  ])

  if (!service.data || !horaires.data || horaires.data.length === 0)
    return { statut: 'indisponible' }

  // Mode fixe : rien à géocoder, il n'y a pas d'adresse cliente. On ne
  // « saute » pas une étape, elle n'existe pas dans ce mode.
  const fixe = options.modePro === 'fixe'
  let lieu: AdresseTrouvee | null = null
  if (!fixe) {
    const adresse = await geocoder(options.adresse, 'reservation')
    if (!adresse.trouve) {
      return { statut: 'adresse-a-preciser', suggestions: adresse.suggestions }
    }
    lieu = adresse.trouve
  }

  const jours = joursOuvrables(maintenant, horaires.data, JOURS_PROPOSES)
  if (jours.length === 0) return { statut: 'indisponible' }

  const debutFenetre = jours[0]
  const finFenetre = new Date(jours[jours.length - 1].getTime() + 24 * 3600 * 1000)

  const [rdvs, conges, blocages] = await Promise.all([
    supabase
      .from('appointments')
      .select('starts_at, ends_at, lat, lng')
      .eq('pro_id', options.proId)
      .in('status', ['pending', 'conditional', 'confirmed', 'in_progress'])
      .gte('starts_at', debutFenetre.toISOString())
      .lt('starts_at', finFenetre.toISOString()),
    supabase
      .from('time_off')
      .select('starts_at, ends_at')
      .eq('pro_id', options.proId)
      .lt('starts_at', finFenetre.toISOString())
      .gte('ends_at', debutFenetre.toISOString()),
    supabase
      .from('blocked_slots')
      .select('starts_at, ends_at')
      .eq('pro_id', options.proId)
      .lt('starts_at', finFenetre.toISOString())
      .gte('ends_at', debutFenetre.toISOString()),
  ])

  // Le géo-filtrage est une capacité de l'offre 2. Sans elle, on ne tient pas
  // compte des lieux : les créneaux restent simples, et c'est conforme.
  const etat: SubscriptionState = abonnement.data
    ? { tier: abonnement.data.tier, status: abonnement.data.status }
    : { tier: 'tier_1', status: 'canceled' }
  // En fixe, le géo-filtrage n'a rien à filtrer : la pro ne se déplace pas.
  // Le gating reste par palier (D10 ③), c'est la géographie qui disparaît, pas
  // le droit.
  const geoFiltre = !fixe && can(etat, 'booking_geo_filtered')

  // A5 / A6 : hors zone, on ne calcule pas de créneaux tout de suite. La
  // cliente choisit d'abord entre « je serai sur place » et « je demande quand
  // même ». Sans le géo-filtrage (offre 1), la zone ne filtre rien : le pro n'a
  // pas souscrit à ça.
  let horsZone = false
  if (geoFiltre && lieu && can(etat, 'booking_travelling')) {
    const position = positionDansZone(await zoneDuPro(options.proId), {
      point: lieu.point,
      inseeCode: lieu.inseeCode,
    })
    if (position.statut === 'dehors') {
      if (!options.accepterHorsZone) {
        return {
          statut: 'hors-zone',
          adresse: lieu,
          distanceKm: position.distanceKm,
          repere: position.repere,
        }
      }
      horsZone = true
    }
  }

  const rendezVous = (rdvs.data ?? []).map((r) => ({
    debut: new Date(r.starts_at),
    fin: new Date(r.ends_at),
    lieu: geoFiltre && r.lat !== null && r.lng !== null ? { lat: r.lat, lng: r.lng } : null,
  }))

  const indisponibilites = [...(conges.data ?? []), ...(blocages.data ?? [])].map((i) => ({
    debut: new Date(i.starts_at),
    fin: new Date(i.ends_at),
  }))

  const lookup = lieu ? await tableDesTrajets(rendezVous, lieu.point, geoFiltre) : () => 0
  const dureeCatalogue = service.data.duration_min

  // La durée apprise remplace celle du catalogue, puis le tampon nouvelle
  // cliente (B5) s'y ajoute : le tampon est un temps de découverte, pas un
  // temps de prestation, et il n'a donc rien à faire dans l'apprentissage.
  const duree =
    dureeApprise({
      dureeCatalogue,
      historiquePro: (apprentissage.data ?? [])
        .filter(
          (r): r is typeof r & { actual_duration_min: number } =>
            typeof r.actual_duration_min === 'number',
        )
        // B5 — une durée ÉCRITE par la pro est une instruction, pas une
        // observation. Le drapeau vient de la clôture : on ne le devine pas,
        // parce que deviner marcherait jusqu'au jour où elle saisit une durée
        // en clôturant à l'heure.
        .map((r) => ({ minutes: r.actual_duration_min, corrigee: r.duration_declared })),
    }) + (reglages.data?.new_client_buffer_min ?? 0)

  const proposables: JourProposable[] = []
  for (const jour of jours) {
    const plages = plagesDuJour(jour, horaires.data, indisponibilites)
    if (plages.length === 0) continue
    const finJour = new Date(jour.getTime() + 24 * 3600 * 1000)
    const creneaux = creneauxDuJour(
      {
        plages,
        rdvs: rendezVous.filter((r) => r.debut >= jour && r.debut < finJour),
        dureeMin: duree,
        lieuCliente: lieu?.point ?? null,
        pasAvant: maintenant,
        pointDeDepart:
          depart.data?.start_lat != null && depart.data.start_lng != null
            ? { lat: depart.data.start_lat, lng: depart.data.start_lng }
            : null,
      },
      lookup,
    )
    if (creneaux.length > 0) proposables.push({ jour, creneaux })
  }

  return { statut: 'ok', jours: proposables, geoFiltre, adresse: lieu, horsZone }
}

/**
 * Précalcule les trajets entre chaque rendez-vous localisé et la cliente, en
 * un seul appel. Le moteur de créneaux, lui, reste synchrone et pur.
 *
 * ⚠️ **A12 N'AJOUTE AUCUN APPEL D'ITINÉRAIRE, et voici exactement ce que cela
 * implique.** Le score a besoin de trois durées :
 *
 * · `précédent → cliente` et `cliente → suivant` : **déjà dans cette table**.
 *   Ce sont les valeurs que le contrôle de faisabilité calculait puis jetait ;
 *   elles sont désormais conservées. Ce sont des durées **réelles**.
 * · `précédent → suivant`, plus les trajets depuis et vers le **point de
 *   départ** (D16) : ces couples ne sont PAS dans la table, qui ne contient que
 *   les allers-retours avec la cliente. Ils passent donc par le repli
 *   ci-dessous, `dureeEstimeeMin`, l'estimation à vol d'oiseau calibrée déjà
 *   utilisée partout comme filet.
 *
 * **Ce que ça coûte en justesse, dit franchement** : l'estimation étant
 * toujours inférieure ou égale au trajet réel, le terme soustrait est
 * légèrement sous-évalué, donc le coût marginal légèrement SUR-évalué. Le biais
 * va dans le sens prudent — il rend l'insertion un peu plus chère qu'elle ne
 * l'est — et il est le même pour tous les créneaux d'un même intervalle, donc
 * il ne dérange pas leur ordre relatif.
 *
 * **Ce qu'il faudrait pour l'enlever** : une matrice `lieux × lieux` de plus
 * par requête. Une ligne à ajouter ici. On ne la paie pas avant que la
 * télémétrie de E3 dise que le biais dérange un choix réel.
 */
async function tableDesTrajets(
  rdvs: { lieu: Point | null }[],
  cliente: Point,
  geoFiltre: boolean,
): Promise<(de: Point, vers: Point) => number> {
  const lieux = rdvs.map((r) => r.lieu).filter((l): l is Point => l !== null)
  if (!geoFiltre || lieux.length === 0) return () => 0

  const table = new Map<string, number>()
  const cle = (a: Point, b: Point) => `${a.lat},${a.lng}>${b.lat},${b.lng}`

  const [versCliente, depuisCliente] = await Promise.all([
    trajets.matrice(lieux, [cliente]),
    trajets.matrice([cliente], lieux),
  ])
  lieux.forEach((lieu, i) => {
    table.set(cle(lieu, cliente), versCliente[i][0].minutes)
    table.set(cle(cliente, lieu), depuisCliente[0][i].minutes)
  })

  // Repli sur l'estimation si un couple manque : mieux vaut une durée
  // approchée qu'un zéro, qui laisserait passer un créneau intenable.
  return (de, vers) => table.get(cle(de, vers)) ?? dureeEstimeeMin(de, vers)
}
