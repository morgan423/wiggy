import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  lienGps,
  estAppGps,
  minutesAvantDepart,
  rappelDeDepartPertinent,
  heureDArriveeEstimee,
  retardArrondiMin,
  fenetreDeReprise,
} from './copilote.ts'

const chezAmelie = { lat: 47.2, lng: -1.55 }

test('chaque GPS reçoit un point, jamais une adresse à réinterpréter', () => {
  // Le piège « rue des Lilas à Pau qui répond dans les Landes » a déjà été payé
  // une fois : c'est notre géocodage qui fait foi, pas celui du GPS.
  for (const app of ['system', 'waze', 'google_maps'] as const) {
    const lien = lienGps(app, chezAmelie, 'Amélie D.')
    assert.match(lien, /47\.2/)
    assert.match(lien, /-1\.55/)
  }
})

test('une valeur inconnue n’est pas une application de navigation', () => {
  assert.ok(estAppGps('waze'))
  assert.ok(!estAppGps('navigation-embarquee'))
})

test('C4 dit quand partir, pas combien de temps il reste', () => {
  // 30 minutes de route, rendez-vous dans 50 minutes : on part dans 20.
  const minutes = minutesAvantDepart({
    debutRdv: new Date('2026-09-07T14:30:00Z'),
    minutesTrajet: 30,
    maintenant: new Date('2026-09-07T13:40:00Z'),
  })
  assert.equal(minutes, 20)
})

test('C4 le dit aussi quand il est déjà trop tard', () => {
  // Pas d'arrondi à zéro : une pro en retard doit le savoir.
  const minutes = minutesAvantDepart({
    debutRdv: new Date('2026-09-07T14:30:00Z'),
    minutesTrajet: 30,
    maintenant: new Date('2026-09-07T14:10:00Z'),
  })
  assert.equal(minutes, -10)
})

test('le rappel de départ ne parle ni trop tôt ni pour rien', () => {
  assert.ok(!rappelDeDepartPertinent(40, 30), 'quarante minutes avant, c’est du bruit')
  assert.ok(rappelDeDepartPertinent(10, 30), 'dix minutes avant, c’est le moment')
  assert.ok(rappelDeDepartPertinent(-10, 30), 'en retard, il sert encore')
  assert.ok(!rappelDeDepartPertinent(-31, 30), 'le rendez-vous a commencé, il ne sert plus')
})

test('C5 tire son heure du trajet en cours', () => {
  const arrivee = heureDArriveeEstimee(new Date('2026-09-07T14:30:00Z'), 25)
  assert.equal(arrivee.toISOString(), '2026-09-07T14:55:00.000Z')
})

test('le retard s’annonce arrondi vers le haut, jamais vers le bas', () => {
  // Annoncer dix minutes et en mettre vingt fait plus de dégâts qu'annoncer un
  // quart d'heure et arriver en avance.
  const debut = new Date('2026-09-07T14:30:00Z')
  assert.equal(retardArrondiMin(debut, new Date('2026-09-07T14:38:00Z')), 15)
  assert.equal(retardArrondiMin(debut, new Date('2026-09-07T14:46:00Z')), 30)
  assert.equal(retardArrondiMin(debut, new Date('2026-09-07T14:25:00Z')), 0)
})

test('sans rythme connu, C7 ne propose aucune fenêtre', () => {
  // Proposer « dans cinq semaines » à quelqu'un qu'on a vu deux fois, c'est
  // deviner à voix haute.
  assert.equal(fenetreDeReprise({ rythmeSemaines: null, depuis: new Date() }), null)
})

test('avec un rythme connu, la fenêtre encadre la semaine attendue', () => {
  const fenetre = fenetreDeReprise({
    rythmeSemaines: 5,
    depuis: new Date('2026-09-07T00:00:00Z'),
  })
  assert.ok(fenetre)
  assert.equal(fenetre.debut.toISOString().slice(0, 10), '2026-10-05')
  assert.equal(fenetre.fin.toISOString().slice(0, 10), '2026-10-19')
})
