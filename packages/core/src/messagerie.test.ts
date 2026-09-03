import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  etatQuotaSms,
  dateEstimeeDAtteinte,
  moisDeFacturation,
  PLAFOND_SMS_MOIS,
} from './messagerie.ts'

test('le plafond est celui des CGV, et il ne se devine pas', () => {
  assert.equal(PLAFOND_SMS_MOIS, 300)
})

test('l’alerte tombe à 80 %, le plafond à 100 %', () => {
  assert.deepEqual(etatQuotaSms(239), { envoyes: 239, atteint: false, alerte: false })
  assert.deepEqual(etatQuotaSms(240), { envoyes: 240, atteint: false, alerte: true })
  assert.deepEqual(etatQuotaSms(300), { envoyes: 300, atteint: true, alerte: true })
})

test('la date d’atteinte suit le rythme observé', () => {
  // 120 SMS en 10 jours, soit 12 par jour. Il en reste 180, donc 15 jours.
  const debut = new Date('2026-09-01T00:00:00Z')
  const maintenant = new Date('2026-09-11T00:00:00Z')
  const atteinte = dateEstimeeDAtteinte({ envoyes: 120, debutDuMois: debut, maintenant })
  assert.equal(atteinte?.toISOString().slice(0, 10), '2026-09-26')
})

test('un rythme qui ne mène nulle part ne s’annonce pas', () => {
  // 20 SMS en 10 jours : le plafond serait atteint en février. Il ne le sera
  // jamais, la remise à zéro passe avant. Annoncer une date fausse serait pire
  // que se taire.
  const debut = new Date('2026-09-01T00:00:00Z')
  const maintenant = new Date('2026-09-11T00:00:00Z')
  assert.equal(dateEstimeeDAtteinte({ envoyes: 20, debutDuMois: debut, maintenant }), null)
})

test('sans recul, on ne prédit rien', () => {
  const debut = new Date('2026-09-01T00:00:00Z')
  assert.equal(
    dateEstimeeDAtteinte({
      envoyes: 50,
      debutDuMois: debut,
      maintenant: new Date('2026-09-01T06:00:00Z'),
    }),
    null,
  )
  assert.equal(
    dateEstimeeDAtteinte({
      envoyes: 0,
      debutDuMois: debut,
      maintenant: new Date('2026-09-15T00:00:00Z'),
    }),
    null,
  )
})

test('la remise à zéro du 1er est une conséquence de la clé, pas une tâche', () => {
  assert.equal(moisDeFacturation(new Date('2026-09-30T23:59:59Z')), '2026-09-01')
  assert.equal(moisDeFacturation(new Date('2026-10-01T00:00:00Z')), '2026-10-01')
})
