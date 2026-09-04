import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coutMarginal, noterCreneau, repartirEnEtages, POIDS } from './score.ts'
import { creneauxDuJour } from './creneaux.ts'
import { dureeEstimeeMin, type Point } from './trajets.ts'

/* Pau et ses environs. Deux points « du même quartier », un point éloigné. */
const CENTRE: Point = { lat: 43.2951, lng: -0.3708 }
const VOISIN: Point = { lat: 43.2965, lng: -0.3721 } // ~200 m du centre
const LOIN: Point = { lat: 43.395, lng: -0.28 } // ~13 km, une autre commune

const h = (jour: string, heure: string) => new Date(`${jour}T${heure}:00.000Z`)
const JOUR = '2026-09-10'

test('le coût marginal est ce que le rendez-vous AJOUTE, pas ce qu’il coûte', () => {
  // La pro allait déjà rouler 20 minutes du précédent au suivant. S'arrêter en
  // chemin lui en coûte 25 : elle n'ajoute que 5 minutes à sa journée.
  assert.equal(coutMarginal({ trajetAvant: 12, trajetApres: 13, trajetDirect: 20 }), 5)
})

test('un détour sur la route ne peut jamais faire GAGNER du temps', () => {
  assert.equal(coutMarginal({ trajetAvant: 5, trajetApres: 5, trajetDirect: 30 }), 0)
})

test('en mode fixe, aucun trajet donc aucune hiérarchie : tous les créneaux se valent', () => {
  // D10 ① — la cliente se déplace. Ce n'est pas un cas dégradé, c'est le calcul
  // juste : sans déplacement, un créneau libre est libre.
  const note = noterCreneau({ lieuCliente: null, entreDeuxRendezVous: true })
  assert.deepEqual(note, { coutMarginalMin: 0, score: 0 })
})

test('LE CAS DE LA ROADMAP : l’aller-retour de 45 min en plein milieu', () => {
  /*
    Une journée avec deux rendez-vous proches et du mou. Une cliente éloignée
    demande un créneau au milieu : faisable au sens strict, absurde au sens du
    métier. Il doit rester RÉSERVABLE, et se retrouver au second étage.
  */
  const rdvs = [
    { debut: h(JOUR, '09:00'), fin: h(JOUR, '10:00'), lieu: CENTRE },
    { debut: h(JOUR, '15:00'), fin: h(JOUR, '16:00'), lieu: VOISIN },
  ]
  const trajet = (a: Point, b: Point) => Math.round(dureeEstimeeMin(a, b))

  const creneaux = creneauxDuJour(
    {
      plages: [{ debut: h(JOUR, '09:00'), fin: h(JOUR, '18:00') }],
      rdvs,
      dureeMin: 60,
      lieuCliente: LOIN,
      pasMin: 60,
    },
    trajet,
  )

  const auMilieu = creneaux.find((c) => c.debut.getTime() === h(JOUR, '12:00').getTime())
  // ⚠️ LA RÈGLE D'OR : il est toujours là.
  assert.ok(auMilieu, 'le créneau du milieu doit rester RÉSERVABLE')
  assert.ok(
    auMilieu.coutMarginalMin >= POIDS.SEUIL_SAUT_ISOLE_MIN,
    'l’aller-retour doit être compté comme un saut isolé',
  )
  assert.ok(auMilieu.score < 0, 'et il doit être mal noté')

  const { recommandes, autres } = repartirEnEtages(creneaux)
  const dansLePremier = recommandes.some((c) => c.debut.getTime() === auMilieu.debut.getTime())
  const dansLeSecond = autres.some((c) => c.debut.getTime() === auMilieu.debut.getTime())
  assert.equal(dansLePremier, false, 'jamais au premier étage')
  assert.equal(dansLeSecond, true, 'toujours présent au second')
})

test('LE CAS SYMÉTRIQUE : boucher un trou entre deux rendez-vous du même coin', () => {
  const rdvs = [
    { debut: h(JOUR, '09:00'), fin: h(JOUR, '10:00'), lieu: CENTRE },
    { debut: h(JOUR, '12:00'), fin: h(JOUR, '13:00'), lieu: VOISIN },
  ]
  const trajet = (a: Point, b: Point) => Math.round(dureeEstimeeMin(a, b))

  const creneaux = creneauxDuJour(
    {
      plages: [{ debut: h(JOUR, '09:00'), fin: h(JOUR, '18:00') }],
      rdvs,
      dureeMin: 60,
      lieuCliente: VOISIN,
      pasMin: 60,
    },
    trajet,
  )

  // Le créneau qui tient ENTRE les deux rendez-vous, quel qu'il soit : on le
  // cherche plutôt que de le supposer, le pas d'alignement décidant de l'heure.
  const dansLeTrou = creneaux.find(
    (c) =>
      c.debut.getTime() >= h(JOUR, '10:00').getTime() &&
      c.fin.getTime() <= h(JOUR, '12:00').getTime(),
  )
  assert.ok(dansLeTrou, 'le créneau qui bouche le trou existe')
  assert.ok(dansLeTrou.score > 0, 'et il est bien noté')

  const { recommandes } = repartirEnEtages(creneaux)
  assert.equal(recommandes[0].score >= dansLeTrou.score, true)
  assert.ok(
    recommandes.some((c) => c.debut.getTime() === dansLeTrou.debut.getTime()),
    'il doit être au premier étage',
  )
})

test('AUCUN CRÉNEAU NE DISPARAÎT : les deux étages contiennent tout', () => {
  const creneaux = [
    { debut: h(JOUR, '09:00'), score: 40 },
    { debut: h(JOUR, '10:00'), score: 30 },
    { debut: h(JOUR, '11:00'), score: -50 },
    { debut: h(JOUR, '12:00'), score: -60 },
  ]
  const { recommandes, autres } = repartirEnEtages(creneaux)
  assert.equal(recommandes.length + autres.length, creneaux.length)
})

test('les deux étages sont en ordre CHRONOLOGIQUE, pas en ordre de score', () => {
  // La cliente lit un agenda, pas un classement : un premier étage trié par
  // note lui présenterait jeudi avant mardi sans raison visible.
  const creneaux = [
    { debut: h(JOUR, '11:00'), score: 10 },
    { debut: h(JOUR, '09:00'), score: 40 },
    { debut: h(JOUR, '10:00'), score: 30 },
  ]
  const { recommandes } = repartirEnEtages(creneaux)
  assert.deepEqual(
    recommandes.map((c) => c.debut.getUTCHours()),
    [9, 10, 11],
  )
})

test('un seul créneau distingué ne fait pas une recommandation', () => {
  // Il ne laisse aucun choix, et le titre promettrait plus que la liste ne tient.
  const { recommandes, autres } = repartirEnEtages([
    { debut: h(JOUR, '09:00'), score: 40 },
    { debut: h(JOUR, '10:00'), score: -50 },
  ])
  assert.deepEqual(recommandes, [])
  assert.equal(autres.length, 2)
})

test('le premier étage est plafonné : une recommandation n’est pas une liste', () => {
  const creneaux = Array.from({ length: 20 }, (_, i) => ({
    debut: h(JOUR, `${String(8 + i).padStart(2, '0')}:00`),
    score: 10,
  }))
  const { recommandes, autres } = repartirEnEtages(creneaux)
  assert.equal(recommandes.length, POIDS.MAX_PREMIER_ETAGE)
  assert.equal(autres.length, 20 - POIDS.MAX_PREMIER_ETAGE)
})

test('le point de départ note le PREMIER créneau du jour au lieu de l’exonérer', () => {
  // D16 — sans lui, un créneau de 9 h sur une journée vide paraîtrait gratuit.
  const commun = {
    plages: [{ debut: h(JOUR, '09:00'), fin: h(JOUR, '12:00') }],
    rdvs: [],
    dureeMin: 60,
    lieuCliente: LOIN,
    pasMin: 60,
  }
  const trajet = (a: Point, b: Point) => Math.round(dureeEstimeeMin(a, b))
  const sans = creneauxDuJour(commun, trajet)
  const avec = creneauxDuJour({ ...commun, pointDeDepart: CENTRE }, trajet)

  assert.equal(sans[0].coutMarginalMin, 0, 'sans point de départ, rien à compter')
  assert.ok(avec[0].coutMarginalMin > 0, 'avec, l’aller-retour depuis chez elle est compté')
})
