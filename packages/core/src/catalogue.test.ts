import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  presenterCatalogue,
  prixDEntree,
  GROUPE_AUTRES,
  A_PLAT,
  type PrestationCatalogue,
} from './catalogue.ts'
import { noteGlobale, noteBalisable, formatNote, SEUIL_MOYENNE } from './note-globale.ts'

const p = (id: string, prix: number, categorie: string | null = null): PrestationCatalogue => ({
  id,
  name: id,
  price_cents: prix,
  category: categorie,
})

/* ── Les seuils du repli (20a) ────────────────────────────────────────────── */

test('catalogue — une à trois prestations restent À PLAT, sans repli', () => {
  for (const n of [1, 2, 3]) {
    const liste = Array.from({ length: n }, (_, i) => p(`s${String(i)}`, 3000 + i))
    const c = presenterCatalogue(liste)
    assert.equal(c.forme, 'plate', `${String(n)} prestation(s) ne devraient pas se replier`)
  }
})

test('catalogue — À QUATRE, le repli commence : trois à plat, le reste dessous', () => {
  const liste = Array.from({ length: 4 }, (_, i) => p(`s${String(i)}`, 3000 + i))
  const c = presenterCatalogue(liste)
  assert.ok(c.forme === 'repliee')
  assert.equal(c.visibles.length, A_PLAT)
  assert.equal(c.repliees.length, 1)
})

test('catalogue — la page reste courte à vingt prestations comme à neuf', () => {
  for (const n of [9, 20]) {
    const liste = Array.from({ length: n }, (_, i) => p(`s${String(i)}`, 3000 + i))
    const c = presenterCatalogue(liste)
    assert.ok(c.forme === 'repliee')
    assert.equal(c.visibles.length, A_PLAT, 'toujours trois à plat, quel que soit le total')
    assert.equal(c.repliees.length, n - A_PLAT)
  }
})

test('catalogue — L’ORDRE DE LA PRO FAIT FOI, on ne trie jamais par prix', () => {
  // La plus chère est en tête de SA liste : elle reste en tête.
  const liste = [p('chere', 12000), p('moyenne', 5000), p('douce', 2000), p('quatrieme', 3000)]
  const c = presenterCatalogue(liste)
  assert.ok(c.forme === 'repliee')
  assert.deepEqual(
    c.visibles.map((x) => x.id),
    ['chere', 'moyenne', 'douce'],
  )
})

test('catalogue — avec des groupes, ce sont des rangées de groupes', () => {
  const liste = [p('a', 3800, 'Coupe'), p('b', 6000, 'Technique'), p('c', 4500, 'Coupe')]
  const c = presenterCatalogue(liste)
  assert.ok(c.forme === 'groupes')
  // L'ordre de PREMIÈRE APPARITION, pas l'ordre alphabétique : « Coupe » est
  // arrivée avant « Technique » dans la liste de la pro.
  assert.deepEqual(
    c.groupes.map((g) => g.nom),
    ['Coupe', 'Technique'],
  )
  assert.equal(c.groupes[0]?.desCentimes, 3800, 'le « dès » du groupe est son plus bas prix')
})

test('catalogue — une prestation hors groupe rejoint « Autres », en dernier', () => {
  const liste = [p('a', 3800, 'Coupe'), p('seule', 2000, null)]
  const c = presenterCatalogue(liste)
  assert.ok(c.forme === 'groupes')
  assert.equal(c.groupes.at(-1)?.nom, GROUPE_AUTRES)
})

test('catalogue — SANS AUCUN GROUPE, il n’y a pas de rangée « Autres »', () => {
  // Ne rien ranger est un choix que B13 autorise : une rangée « Autres »
  // suggérerait qu'il manque un rangement.
  const c = presenterCatalogue([p('a', 3000), p('b', 4000)])
  assert.equal(c.forme, 'plate')
})

test('catalogue — aucune prestation : la section disparaît, elle ne s’affiche pas vide', () => {
  assert.equal(presenterCatalogue([]).forme, 'vide')
})

test('catalogue — le prix d’entrée est le plus bas, jamais le premier de la liste', () => {
  assert.equal(prixDEntree([p('a', 5000), p('b', 1800)]), 1800)
  assert.equal(prixDEntree([]), undefined)
})

/* ── La note globale, seuil à trois (20a) ─────────────────────────────────── */

test('note — à ZÉRO avis, la ligne disparaît. Jamais un zéro', () => {
  assert.equal(noteGlobale([]).forme, 'aucune')
})

test('note — À UN OU DEUX AVIS, le nombre seul, JAMAIS la moyenne', () => {
  // Une moyenne sur un ou deux avis est un avis déguisé en statistique.
  assert.deepEqual(noteGlobale([5]), { forme: 'nombre', nombre: 1 })
  assert.deepEqual(noteGlobale([5, 4]), { forme: 'nombre', nombre: 2 })
})

test('note — à trois avis, la moyenne apparaît', () => {
  assert.equal(SEUIL_MOYENNE, 3)
  assert.deepEqual(noteGlobale([5, 5, 4]), { forme: 'moyenne', moyenne: 4.7, nombre: 3 })
})

test('note — la moyenne s’arrondit au dixième, APRÈS la moyenne et pas avant', () => {
  // 4,4 arrondi note par note remonterait à 4,5 sans raison.
  assert.deepEqual(noteGlobale([4, 4, 5, 5, 4]), { forme: 'moyenne', moyenne: 4.4, nombre: 5 })
})

test('note — LE BALISAGE SUIT LE MÊME SEUIL que l’affichage', () => {
  // Sinon les moteurs annonceraient une note que la page refuse de montrer.
  assert.equal(noteBalisable(noteGlobale([5])), null)
  assert.equal(noteBalisable(noteGlobale([5, 4])), null)
  assert.deepEqual(noteBalisable(noteGlobale([5, 5, 4])), { moyenne: 4.7, nombre: 3 })
})

test('note — la moyenne s’écrit à la française, sans « ,0 » superflu', () => {
  assert.equal(formatNote(4.9), '4,9')
  assert.equal(formatNote(5), '5')
})
