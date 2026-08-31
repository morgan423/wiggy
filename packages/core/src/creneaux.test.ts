import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creneauxDuJour, plagesDuJour, joursOuvrables, type Creneau } from './creneaux.ts'
import { heureLocaleVersInstant, instantVersHeureLocale } from './temps.ts'
import type { Point } from './trajets.ts'

const PAU: Point = { lat: 43.3219, lng: -0.3435 }
const LESCAR: Point = { lat: 43.3339, lng: -0.4306 }
const JURANCON: Point = { lat: 43.2911, lng: -0.3711 }

/** Heure murale de test. */
function h(murale: string): Date {
  const d = heureLocaleVersInstant(murale)
  assert.ok(d, murale)
  return d
}

const hhmm = (d: Date) => instantVersHeureLocale(d).slice(11)
const heures = (creneaux: Creneau[]) => creneaux.map((c) => hhmm(c.debut))

/** Trajets fixes, pour que le test porte sur la logique et non sur la carte. */
const TRAJETS = new Map<string, number>([
  [`${PAU.lat}>${LESCAR.lat}`, 15],
  [`${LESCAR.lat}>${PAU.lat}`, 15],
  [`${PAU.lat}>${JURANCON.lat}`, 18],
  [`${JURANCON.lat}>${PAU.lat}`, 18],
  [`${LESCAR.lat}>${JURANCON.lat}`, 26],
  [`${JURANCON.lat}>${LESCAR.lat}`, 26],
])
const trajet = (de: Point, vers: Point) => TRAJETS.get(`${de.lat}>${vers.lat}`) ?? 0

const JOURNEE = [{ debut: h('2026-09-15T09:00'), fin: h('2026-09-15T18:00') }]

test('une journée vide s’ouvre entièrement', () => {
  const c = creneauxDuJour(
    { plages: JOURNEE, rdvs: [], dureeMin: 60, lieuCliente: PAU, pasMin: 60 },
    trajet,
  )
  assert.deepEqual(heures(c), [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ])
})

test('aucun créneau ne chevauche un rendez-vous existant', () => {
  const c = creneauxDuJour(
    {
      plages: JOURNEE,
      rdvs: [{ debut: h('2026-09-15T11:00'), fin: h('2026-09-15T12:00'), lieu: PAU }],
      dureeMin: 60,
      lieuCliente: PAU,
      pasMin: 60,
    },
    trajet,
  )
  assert.ok(!heures(c).includes('11:00'))
  // Même lieu, trajet nul : 10:00 tient jusqu'à 11:00, et 12:00 enchaîne.
  assert.ok(heures(c).includes('10:00'))
  assert.ok(heures(c).includes('12:00'))
})

test('le trajet depuis le rendez-vous précédent est décompté', () => {
  // Rendez-vous à Lescar jusqu'à 11:00, cliente à Pau : 15 min de route.
  // 11:00 devient impossible, 11:15 est le premier atteignable.
  const c = creneauxDuJour(
    {
      plages: JOURNEE,
      rdvs: [{ debut: h('2026-09-15T10:00'), fin: h('2026-09-15T11:00'), lieu: LESCAR }],
      dureeMin: 45,
      lieuCliente: PAU,
      pasMin: 15,
    },
    trajet,
  )
  const apres = heures(c).filter((x) => x >= '11:00')
  assert.equal(apres[0], '11:15', `premier créneau après le RDV : ${apres[0]}`)
})

test('le trajet vers le rendez-vous suivant est décompté', () => {
  // Rendez-vous à Jurançon à 15:00, cliente à Lescar : 26 min de route.
  // Il faut être parti à 14:34, donc finir au plus tard à 14:34.
  const c = creneauxDuJour(
    {
      plages: JOURNEE,
      rdvs: [{ debut: h('2026-09-15T15:00'), fin: h('2026-09-15T16:00'), lieu: JURANCON }],
      dureeMin: 60,
      lieuCliente: LESCAR,
      pasMin: 15,
    },
    trajet,
  )
  const avant = heures(c).filter((x) => x < '15:00')
  assert.equal(avant.at(-1), '13:30', `dernier créneau avant le RDV : ${avant.at(-1)}`)
})

test('un créneau pris en étau entre deux rendez-vous éloignés est refusé', () => {
  // 11:00 Lescar, puis 13:00 Jurançon. Entre les deux, une cliente à Pau :
  // 15 min pour venir, 18 min pour repartir, sur un trou de 2 h. Une
  // prestation de 90 min ne rentre pas (15 + 90 + 18 = 123 > 120).
  const demande = {
    plages: JOURNEE,
    rdvs: [
      { debut: h('2026-09-15T10:00'), fin: h('2026-09-15T11:00'), lieu: LESCAR },
      { debut: h('2026-09-15T13:00'), fin: h('2026-09-15T14:00'), lieu: JURANCON },
    ],
    lieuCliente: PAU,
    pasMin: 15,
  }
  const trop = creneauxDuJour({ ...demande, dureeMin: 90 }, trajet)
  assert.deepEqual(
    heures(trop).filter((x) => x >= '11:00' && x < '13:00'),
    [],
    'aucun créneau ne devrait tenir dans le trou',
  )

  // Une prestation de 60 min, elle, rentre : 15 + 60 + 18 = 93 < 120.
  const tient = creneauxDuJour({ ...demande, dureeMin: 60 }, trajet)
  assert.ok(heures(tient).includes('11:15'), heures(tient).join(' '))
})

test('un rendez-vous sans lieu connu ne bloque pas les créneaux', () => {
  // Adresse mal saisie ou non géocodée : on ne peut rien affirmer sur le
  // trajet. Masquer le créneau punirait le pro pour une donnée manquante.
  const c = creneauxDuJour(
    {
      plages: JOURNEE,
      rdvs: [{ debut: h('2026-09-15T10:00'), fin: h('2026-09-15T11:00'), lieu: null }],
      dureeMin: 60,
      lieuCliente: PAU,
      pasMin: 60,
    },
    trajet,
  )
  assert.ok(heures(c).includes('11:00'))
})

test('les créneaux passés ne sont jamais proposés', () => {
  const c = creneauxDuJour(
    {
      plages: JOURNEE,
      rdvs: [],
      dureeMin: 60,
      lieuCliente: PAU,
      pasMin: 60,
      pasAvant: h('2026-09-15T14:00'),
    },
    trajet,
  )
  assert.deepEqual(heures(c), ['14:00', '15:00', '16:00', '17:00'])
})

test('le créneau tient toujours dans la plage de travail', () => {
  const c = creneauxDuJour(
    {
      plages: [{ debut: h('2026-09-15T09:00'), fin: h('2026-09-15T12:00') }],
      rdvs: [],
      dureeMin: 90,
      lieuCliente: PAU,
      pasMin: 30,
    },
    trajet,
  )
  assert.equal(heures(c).at(-1), '10:30', 'le dernier créneau finit à 12:00 pile')
})

test('les congés découpent la journée en deux plages', () => {
  // Mardi 15 septembre 2026, 9h-18h, avec une indisponibilité de 12h à 14h.
  const plages = plagesDuJour(
    h('2026-09-15T12:00'),
    [{ weekday: 1, starts_at: '09:00:00', ends_at: '18:00:00' }],
    [{ debut: h('2026-09-15T12:00'), fin: h('2026-09-15T14:00') }],
  )
  assert.equal(plages.length, 2)
  assert.deepEqual(
    plages.map((p) => `${hhmm(p.debut)}-${hhmm(p.fin)}`),
    ['09:00-12:00', '14:00-18:00'],
  )
})

test('un jour non travaillé n’a aucune plage', () => {
  // Le 15 septembre 2026 est un mardi (weekday 1) ; on ne déclare que le lundi.
  const plages = plagesDuJour(
    h('2026-09-15T12:00'),
    [{ weekday: 0, starts_at: '09:00:00', ends_at: '18:00:00' }],
    [],
  )
  assert.deepEqual(plages, [])
})

test('une indisponibilité qui couvre tout supprime la plage', () => {
  const plages = plagesDuJour(
    h('2026-09-15T12:00'),
    [{ weekday: 1, starts_at: '09:00:00', ends_at: '18:00:00' }],
    [{ debut: h('2026-09-15T08:00'), fin: h('2026-09-15T20:00') }],
  )
  assert.deepEqual(plages, [])
})

test('joursOuvrables ne retient que les jours travaillés', () => {
  // À partir du lundi 14 septembre 2026, sur deux semaines, mardi et jeudi.
  const jours = joursOuvrables(h('2026-09-14T08:00'), [{ weekday: 1 }, { weekday: 3 }], 14)
  assert.deepEqual(
    jours.map((j) => instantVersHeureLocale(j).slice(0, 10)),
    ['2026-09-15', '2026-09-17', '2026-09-22', '2026-09-24'],
  )
})
