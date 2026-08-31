import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEuros, formatEuros, montantAcompte, resteAPayer } from './money.ts'

test('parseEuros accepte les usages français', () => {
  assert.equal(parseEuros('42'), 4200)
  assert.equal(parseEuros('42,50'), 4250)
  assert.equal(parseEuros('42.50'), 4250)
  assert.equal(parseEuros('42,5'), 4250)
  assert.equal(parseEuros(' 42,50 € '), 4250)
  assert.equal(parseEuros('1 250,00'), 125000)
  assert.equal(parseEuros('0,05'), 5)
})

test('parseEuros refuse ce qui n’est pas un montant', () => {
  for (const saisie of ['', 'gratuit', '-10', '42,505', '4,2,3', '.', '€']) {
    assert.equal(parseEuros(saisie), null, saisie)
  }
})

test('parseEuros ne perd pas de centime sur les flottants pénibles', () => {
  // 42.35 * 100 vaut 4234.9999… en flottant : le piège classique.
  assert.equal(parseEuros('42,35'), 4235)
  assert.equal(parseEuros('19,99'), 1999)
  assert.equal(parseEuros('29,90'), 2990)
})

test('formatEuros produit un affichage français', () => {
  // L'espace avant € est insécable : on compare sans en dépendre.
  assert.match(formatEuros(4250).replace(/\s/g, ' '), /^42,50 €$/)
  assert.match(formatEuros(2990).replace(/\s/g, ' '), /^29,90 €$/)
})

test('l’acompte s’arrondit vers le haut et ne dépasse jamais le prix', () => {
  assert.equal(montantAcompte(6500, 30), 1950)
  assert.equal(montantAcompte(4235, 30), 1271) // 1270,5 → 1271
  assert.equal(montantAcompte(6500, 100), 6500)
  assert.equal(montantAcompte(1, 30), 1)
})

test('acompte + reste à payer font toujours le prix', () => {
  for (const prix of [1, 5, 999, 2990, 4235, 6500, 125000]) {
    for (const pct of [1, 30, 50, 99, 100]) {
      assert.equal(montantAcompte(prix, pct) + resteAPayer(prix, pct), prix, `${prix} à ${pct} %`)
    }
  }
})
