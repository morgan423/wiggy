import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  heureLocaleVersInstant,
  instantVersHeureLocale,
  debutDeJour,
  debutDeSemaine,
  ajouterJours,
  joursDeLaSemaine,
  finRendezVous,
  decalageMs,
} from './temps.ts'

const iso = (d: Date) => d.toISOString()

/**
 * Convertit une heure murale de test, en échouant franchement si elle est
 * invalide : dans un test, une date nulle doit casser bruyamment, pas se
 * propager en `undefined`.
 */
function instant(murale: string): Date {
  const d = heureLocaleVersInstant(murale)
  assert.ok(d, `heure murale invalide dans le test : ${murale}`)
  return d
}

test('heure d’hiver : 14:00 à Paris = 13:00 UTC', () => {
  assert.equal(iso(instant('2026-01-15T14:00')), '2026-01-15T13:00:00.000Z')
})

test('heure d’été : 14:00 à Paris = 12:00 UTC', () => {
  assert.equal(iso(instant('2026-07-15T14:00')), '2026-07-15T12:00:00.000Z')
})

test('aller-retour sans perte, été comme hiver', () => {
  for (const murale of [
    '2026-01-15T09:30',
    '2026-07-15T09:30',
    '2026-03-28T23:30',
    '2026-10-25T04:00',
  ]) {
    assert.equal(instantVersHeureLocale(instant(murale)), murale, murale)
  }
})

test('passage à l’heure d’été : le décalage bascule à la bonne heure', () => {
  // Le 29 mars 2026 à 02:00 locale, il est 03:00. 01:59 est encore en +1.
  const avant = instant('2026-03-29T01:30')
  const apres = instant('2026-03-29T04:00')
  assert.equal(decalageMs(avant) / 3_600_000, 1)
  assert.equal(decalageMs(apres) / 3_600_000, 2)
})

test('le jour du changement d’heure garde ses heures civiles', () => {
  // Piège classique : ajouter 24 h au lieu d'un jour civil décale d'une heure.
  const samedi = instant('2026-10-24T09:00')
  const dimanche = ajouterJours(samedi, 1) // ce jour-là dure 25 h
  assert.equal(instantVersHeureLocale(dimanche), '2026-10-25T09:00')

  const veille = instant('2026-03-28T09:00')
  assert.equal(instantVersHeureLocale(ajouterJours(veille, 1)), '2026-03-29T09:00')
})

test('début de jour = minuit heure de Paris, pas minuit UTC', () => {
  const midi = instant('2026-07-15T12:00')
  assert.equal(iso(debutDeJour(midi)), '2026-07-14T22:00:00.000Z')
  assert.equal(instantVersHeureLocale(debutDeJour(midi)), '2026-07-15T00:00')
})

test('une heure juste après minuit reste dans le bon jour', () => {
  // 00:30 heure de Paris en été, c'est 22:30 UTC la veille : un calcul fait en
  // UTC rangerait ce rendez-vous dans la mauvaise journée.
  const tot = instant('2026-07-15T00:30')
  assert.equal(instantVersHeureLocale(debutDeJour(tot)), '2026-07-15T00:00')
})

test('la semaine commence le lundi', () => {
  // Le 15 juillet 2026 est un mercredi.
  const mercredi = instant('2026-07-15T12:00')
  assert.equal(instantVersHeureLocale(debutDeSemaine(mercredi)), '2026-07-13T00:00')

  // Un dimanche appartient à la semaine qui l'a commencé, pas à la suivante.
  const dimanche = instant('2026-07-19T23:00')
  assert.equal(instantVersHeureLocale(debutDeSemaine(dimanche)), '2026-07-13T00:00')

  const lundi = instant('2026-07-13T00:00')
  assert.equal(instantVersHeureLocale(debutDeSemaine(lundi)), '2026-07-13T00:00')
})

test('joursDeLaSemaine donne sept jours consécutifs à minuit', () => {
  const jours = joursDeLaSemaine(instant('2026-10-21T12:00'))
  assert.equal(jours.length, 7)
  assert.deepEqual(
    jours.map(instantVersHeureLocale),
    [
      '2026-10-19T00:00',
      '2026-10-20T00:00',
      '2026-10-21T00:00',
      '2026-10-22T00:00',
      '2026-10-23T00:00',
      '2026-10-24T00:00',
      '2026-10-25T00:00',
    ],
    'la semaine du changement d’heure compte sept jours, pas six et demi',
  )
})

test('une saisie invalide ne produit pas une date invalide', () => {
  for (const saisie of ['', '2026-13-01T10:00', 'demain', '2026-07-15', '2026-07-15T25:00']) {
    assert.equal(heureLocaleVersInstant(saisie), null, saisie)
  }
})

test('la fin du rendez-vous suit la durée', () => {
  const debut = instant('2026-07-15T14:00')
  assert.equal(instantVersHeureLocale(finRendezVous(debut, 45)), '2026-07-15T14:45')
  assert.equal(instantVersHeureLocale(finRendezVous(debut, 90)), '2026-07-15T15:30')
})
