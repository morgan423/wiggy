import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copy, remplir } from './index.ts'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Toutes les chaînes verbatim des SOURCES RATIFIÉES.
 *
 * Deux sources désormais, et le test ne fait pas la différence entre elles :
 * le board de la phase 2 (`bloc: 1a` à `13b`), et la spécification écran par
 * écran de Design (`bloc: spec-14`), qui fait foi pour les écrans depuis la
 * livraison 1. Un texte qui ne vient d'aucune des deux est un texte inventé, et
 * il doit se déclarer sous `$aEcrire`.
 */
function chainesDuBoard(): string[] {
  const dossier = join(racine, 'source')
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const bloc = JSON.parse(readFileSync(join(dossier, f), 'utf8')) as { chaines: string[] }
      return bloc.chaines
    })
}

/**
 * Compare à la ponctuation près : le deck filtre les cadratins des sources.
 * Les glyphes d'icône (coche, croix) sont ignorés de la même façon : ils
 * appartiennent au rendu de la planche, pas au texte.
 */
const normaliser = (s: string) =>
  s
    .replace(/[✓✕✔✖]/g, ' ')
    .replace(/[—–]/g, ',')
    .replace(/[:,;.]/g, '')
    .replace(/['’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Parcourt le deck et renvoie toutes ses valeurs de contenu. */
function valeursDuDeck(): { chemin: string; texte: string }[] {
  const sortie: { chemin: string; texte: string }[] = []
  const visiter = (noeud: unknown, chemin: string) => {
    if (typeof noeud === 'string') {
      // Les clés commençant par $ sont des métadonnées, pas du contenu.
      // `$aEcrire` regroupe ce que le board ne fournit pas et que nous avons
      // rédigé : ces chaînes ne peuvent évidemment pas venir du board, mais
      // elles restent soumises aux règles de cadratins et de registre.
      if (!chemin.split('.').some((seg) => seg.startsWith('$')))
        sortie.push({ chemin, texte: noeud })
      return
    }
    if (typeof noeud === 'object' && noeud !== null) {
      for (const [cle, valeur] of Object.entries(noeud)) visiter(valeur, `${chemin}.${cle}`)
    }
  }
  visiter(copy, 'copy')
  return sortie
}

test('chaque chaîne du deck vient du board, sauf celles marquées à écrire', () => {
  const board = chainesDuBoard().map(normaliser)
  const orphelines = valeursDuDeck()
    .filter(({ chemin }) => !chemin.includes('.gabarits.'))
    .filter(({ texte }) => !board.includes(normaliser(texte)))
  assert.deepEqual(
    orphelines.map((o) => `${o.chemin} : « ${o.texte} »`),
    [],
    'ces chaînes ne figurent pas dans le board : elles ont été inventées ou modifiées',
  )
})

test('les gabarits gardent les formulations du board', () => {
  // Le board illustre avec des noms de démonstration ; le produit interpole.
  // On vérifie donc que chaque segment littéral du gabarit, hors marques,
  // existe bien tel quel dans le board : la formulation ne dérive pas, seuls
  // les noms changent.
  const board = chainesDuBoard().map(normaliser)
  const perdus: string[] = []
  for (const { chemin, texte } of valeursDuDeck()) {
    if (!chemin.includes('.gabarits.')) continue
    const segments = texte
      .split(/\{[a-z]+\}/i)
      .map((seg) => normaliser(seg))
      .filter((seg) => seg.length >= 12)
    for (const segment of segments) {
      if (!board.some((b) => b.includes(segment))) perdus.push(`${chemin} : « ${segment} »`)
    }
  }
  assert.deepEqual(perdus, [], 'ces formulations ne figurent pas dans le board')
})

test('aucun cadratin, y compris dans ce que nous avons rédigé', () => {
  const tout = JSON.stringify(copy)
  assert.ok(!/[—–]/.test(tout), 'un cadratin traîne dans le copy deck')
})

test('le registre de chaque écran est déclaré', () => {
  for (const [nom, ecran] of Object.entries(copy)) {
    const registre = (ecran as Record<string, unknown>).$registre
    assert.ok(
      registre === 'pro' || registre === 'cliente' || registre === 'mixte',
      `${nom} : registre manquant ou invalide (${String(registre)})`,
    )
  }
})

test('le registre cliente ne tutoie jamais', () => {
  for (const [nom, ecran] of Object.entries(copy)) {
    if ((ecran as Record<string, unknown>).$registre !== 'cliente') continue
    for (const { chemin, texte } of valeursDuDeck()) {
      if (!chemin.startsWith(`copy.${nom}.`)) continue
      assert.ok(!/\b(tu|ton|ta|tes)\b/i.test(texte), `${chemin} tutoie : « ${texte} »`)
    }
  }
})

test('remplir refuse un gabarit incomplet', () => {
  assert.equal(
    remplir(copy.reservationCliente.gabarits.seDeplace, { pro: 'Léa' }),
    'Léa se déplace chez vous',
  )
  assert.throws(
    () => remplir(copy.reservationCliente.gabarits.confirmationTitre, {}),
    /marque « cliente »/,
  )
})
