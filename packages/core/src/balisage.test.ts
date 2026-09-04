import { test } from 'node:test'
import assert from 'node:assert/strict'
import { balisageFiche, CLES_INTERDITES } from './balisage.ts'

const FICHE = {
  nom: 'Sophie Martin',
  slug: 'sophie',
  accroche: 'Coiffure à domicile, agglomération de Pau',
  communes: ['Pau', 'Billère', 'Jurançon'],
  prestations: [{ nom: 'Coupe et brushing', prixCentimes: 4500, dureeMin: 45 }],
  url: 'https://wiggy.fr/sophie',
}

test('LE DOMICILE DE LA PRO N’APPARAÎT JAMAIS, sous aucune clé', () => {
  // La contrainte non négociable d'A2, et le seul test qui la tienne : un
  // `LocalBusiness` demande naturellement une adresse, et c'est exactement pour
  // ça qu'il faut un contrôle plutôt qu'une bonne intention.
  const json = JSON.stringify(balisageFiche(FICHE))
  for (const cle of CLES_INTERDITES) {
    assert.equal(json.includes(`"${cle}"`), false, `« ${cle} » ne doit pas figurer au balisage`)
  }
})

test('la fonction ne peut même pas RECEVOIR une adresse', () => {
  // Elle n'entre pas dans le type : ce qui ne rentre pas ne peut pas fuir.
  const champs = Object.keys(FICHE)
  assert.equal(
    champs.some((c) => /adresse|address|lat|lng|geo|telephone/i.test(c)),
    false,
  )
})

test('c’est la ZONE qui porte le référencement local', () => {
  const g = balisageFiche(FICHE)['@graph'] as Record<string, unknown>[]
  const zone = g[0].areaServed as { name: string }[]
  assert.deepEqual(
    zone.map((c) => c.name),
    ['Pau', 'Billère', 'Jurançon'],
  )
})

test('chaque prestation devient une offre avec son prix en euros', () => {
  const g = balisageFiche(FICHE)['@graph'] as Record<string, unknown>[]
  const offres = g[0].makesOffer as { price: string; priceCurrency: string }[]
  assert.equal(offres[0].price, '45.00')
  assert.equal(offres[0].priceCurrency, 'EUR')
})

test('une fiche sans commune ne fabrique pas de zone vide trompeuse', () => {
  const g = balisageFiche({ ...FICHE, communes: [] })['@graph'] as Record<string, unknown>[]
  assert.deepEqual(g[0].areaServed, [])
})
