import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, slugAvecSuffixe, SLUG_MAX, SLUG_MIN } from './slug.ts'

// La contrainte que la base impose à la colonne `pros.slug`.
const FORME = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/

test('un nom courant donne une URL lisible', () => {
  assert.equal(slugify('Léa Martin'), 'lea-martin')
  assert.equal(slugify('Jean-Baptiste Côté'), 'jean-baptiste-cote')
  assert.equal(slugify('  Coiffure   Émilie  '), 'coiffure-emilie')
})

test('le slug respecte toujours la contrainte de la base', () => {
  for (const nom of [
    'Léa Martin',
    'A',
    'Al',
    '   ',
    '???',
    '日本語',
    'Jean--Paul',
    'x'.repeat(200),
    'Coiffure & Beauté !!!',
    '-tiret-au-debut-',
  ]) {
    const s = slugify(nom)
    assert.match(s, FORME, `« ${nom} » → « ${s} »`)
    assert.ok(s.length >= SLUG_MIN && s.length <= SLUG_MAX, `${s} (${s.length})`)
  }
})

test('un nom trop court ne produit pas une URL invalide', () => {
  assert.equal(slugify('Al'), 'al-pro')
  assert.equal(slugify('日本語'), 'pro')
})

test('le suffixe de collision garde une forme valide', () => {
  assert.equal(slugAvecSuffixe('alice', 1), 'alice')
  assert.equal(slugAvecSuffixe('alice', 2), 'alice-2')
  const long = slugAvecSuffixe('x'.repeat(SLUG_MAX), 12)
  assert.match(long, FORME)
  assert.ok(long.length <= SLUG_MAX)
})
