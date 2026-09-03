import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { couleurs, PALETTE, regles, wiggy } from './index.ts'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

test('le CSS généré est à jour avec le JSON', () => {
  // Sans ce test, quelqu'un édite le CSS à la main, la source diverge, et le
  // « thème unique » cesse d'en être un.
  const avant = readFileSync(join(racine, 'wiggy-tokens.css'), 'utf8')
  execFileSync('node', [join(racine, 'build.mjs')], { stdio: 'ignore' })
  const apres = readFileSync(join(racine, 'wiggy-tokens.css'), 'utf8')
  assert.equal(apres, avant, 'wiggy-tokens.css n’est pas à jour : lance `npm run tokens:build`')
})

test('aucune couleur hors palette ratifiée', () => {
  // Les 5 sémantiques + 2 fonds de la direction Prune & Framboise, plus les
  // déclinaisons de texte et de trait qui en dérivent. Rien d'autre.
  const RATIFIEES = ['#c2255c', '#45173c', '#f4b23e', '#f98d5c', '#b8432e', '#fbeee6', '#fffdfb']
  for (const hex of RATIFIEES) {
    assert.ok(PALETTE.has(hex), `${hex} manque à la palette`)
  }
  const css = readFileSync(join(racine, 'wiggy-tokens.css'), 'utf8')
  for (const hex of css.match(/#[0-9a-fA-F]{6}/g) ?? []) {
    assert.ok(PALETTE.has(hex.toLowerCase()), `${hex} n’appartient pas à la palette`)
  }
})

test('aucune police résiduelle des itérations abandonnées', () => {
  // Baloo 2 et Nunito Sans appartiennent à la voie B, écartée en phase 1.
  const source =
    readFileSync(join(racine, 'wiggy-tokens.json'), 'utf8') +
    readFileSync(join(racine, 'wiggy-tokens.css'), 'utf8')
  for (const interdite of ['Baloo', 'Nunito']) {
    assert.ok(!source.includes(interdite), `${interdite} traîne encore dans les tokens`)
  }
  assert.equal(wiggy.police.display.valeur, 'Fraunces')
  assert.equal(wiggy.police.ui.valeur, 'Plus Jakarta Sans')
})

test('les règles invisibles sont dans les tokens, pas dans les têtes', () => {
  assert.equal(regles.serifTailleMinimale, 20)
  assert.equal(regles.zoneTactileMin, 44)
  assert.deepEqual(regles.wonkReserveA, ['statement'])
  assert.ok(regles.serifInterditeDans.includes('agenda'))
})

test('le texte sur miel et abricot est prune, jamais blanc', () => {
  // Du blanc sur #F4B23E tombe sous 2:1 — illisible en plein soleil, et le pro
  // travaille dehors.
  assert.equal(wiggy.texte.surMiel.valeur, couleurs.prune)
})

test('la couleur d’action est unique et constante', () => {
  assert.equal(couleurs.action, '#C2255C')
  assert.notEqual(couleurs.action, couleurs.celebration)
})

/** Forme du fichier de référence design, réduite à ce que le test lit. */
type ReferenceDesign = {
  space: number[]
  breakpoints: Record<string, number>
  motion: { celebrations: Record<'confirmationCliente' | 'journeeBouclee', string[]> }
  typeScale: Record<string, { size: number; lineHeight: number; weight: number }>
}

/** Aplatit un objet en chemins « a.b.c » → valeur feuille. */
function feuilles(objet: unknown, prefixe = ''): Map<string, unknown> {
  const sortie = new Map<string, unknown>()
  if (objet && typeof objet === 'object' && !Array.isArray(objet)) {
    for (const [cle, valeur] of Object.entries(objet)) {
      for (const [k, v] of feuilles(valeur, prefixe ? `${prefixe}.${cle}` : cle)) sortie.set(k, v)
    }
  } else {
    sortie.set(prefixe, objet)
  }
  return sortie
}

const norm = (v: unknown): unknown => {
  if (Array.isArray(v)) return JSON.stringify(v.map(norm))
  return typeof v === 'string' ? v.replace(/\s+/g, '').toLowerCase() : v
}

test('chaque valeur du livrable design a une correspondance ici', () => {
  // Arbitrage acté : le design décide des valeurs, le dépôt décide des noms.
  //
  // Ce test parcourt TOUTES les feuilles du fichier design. Une clé sans
  // correspondance le fait échouer — c'est ce qui rend visibles les AJOUTS,
  // là où une simple liste de comparaisons ne voyait que les modifications.
  const D = JSON.parse(
    readFileSync(join(racine, 'reference/design-v2.json'), 'utf8'),
  ) as ReferenceDesign

  // '§' = texte descriptif côté design, sans valeur à refléter ici.
  const CORRESPONDANCE: Record<string, unknown> = {
    $schema: '§',
    'color.framboise.value': couleurs.action,
    'color.framboise.role': '§',
    'color.prune.value': couleurs.prune,
    'color.prune.role': '§',
    'color.miel.value': couleurs.celebration,
    'color.miel.role': '§',
    'color.abricot.value': couleurs.attente,
    'color.abricot.role': '§',
    'color.brique.value': couleurs.erreur,
    'color.brique.role': '§',
    'color.creme.value': couleurs.fond,
    'color.creme.role': '§',
    'color.surface.value': couleurs.surface,
    'color.surface.role': '§',
    'color.interaction.framboiseHover': couleurs.actionSurvol,
    'color.interaction.framboisePressed': couleurs.actionPressee,
    'color.interaction.pruneHover': couleurs.pruneSurvol,
    'color.derived.inkSoft': wiggy.texte.secondaire.valeur,
    'color.derived.inkMuted': wiggy.texte.attenue.valeur,
    'color.derived.border': wiggy.trait.discret.valeur,
    'color.derived.cremeSoft': wiggy.texte.surPleinDoux.valeur,
    'font.display.family': wiggy.police.display.valeur,
    'font.display.rule': '§',
    'font.ui.family': wiggy.police.ui.valeur,
    'font.wonk.fontVariationSettings': wiggy.police.wonk.valeur,
    'font.wonk.rule': '§',
    typeScaleRule: wiggy.typo.$regle,
    'radius.field': wiggy.radius.champ,
    'radius.card': wiggy.radius.carte,
    'radius.block': wiggy.radius.bloc,
    'radius.pill': wiggy.radius.pilule,
    'shadow.card': wiggy.ombre.carte.valeur,
    'shadow.float': wiggy.ombre.flottante.valeur,
    'motion.easing.celebration': wiggy.motion.easing.celebration,
    'motion.easing.standard': wiggy.motion.easing.standard,
    'motion.duration.tap': wiggy.motion.duree.tap,
    'motion.duration.fade': wiggy.motion.duree.fondu,
    'motion.duration.toast': wiggy.motion.duree.toast,
    'motion.duration.underline': wiggy.motion.duree.souligne,
    'motion.duration.pop': wiggy.motion.duree.pop,
    'motion.duration.segment': wiggy.motion.duree.segment,
    'motion.duration.skeleton': wiggy.motion.duree.squelette,
    'motion.tapScale': wiggy.motion.tapScale,
    'motion.reducedMotion': wiggy.motion.mouvementReduit,
    'touch.hitMin': wiggy.regles.zoneTactileMin,
    'registres.pro': wiggy.registres.pro,
    'registres.cliente': wiggy.registres.cliente,
  }
  for (const [d, m] of [
    ['statement', 'statement'],
    ['display', 'display'],
    ['title', 'titre'],
    ['body', 'corps'],
    ['caption', 'caption'],
  ] as const) {
    CORRESPONDANCE[`typeScale.${d}.size`] = wiggy.typo[m].taille
    CORRESPONDANCE[`typeScale.${d}.lineHeight`] = wiggy.typo[m].interligne
    CORRESPONDANCE[`typeScale.${d}.weight`] = wiggy.typo[m].graisse
    CORRESPONDANCE[`typeScale.${d}.font`] = '§'
    CORRESPONDANCE[`typeScale.${d}.scope`] = '§'
  }
  // Les tableaux sont comparés d'un bloc : l'ordre des espacements et la
  // chronologie des célébrations sont eux-mêmes des valeurs.
  CORRESPONDANCE.space = Object.values(wiggy.espacement)
  for (const cle of Object.keys(D.breakpoints)) {
    CORRESPONDANCE[`breakpoints.${cle}`] = (wiggy.breakpoint as Record<string, number>)[cle]
  }
  CORRESPONDANCE['motion.celebrations.confirmationCliente'] =
    wiggy.motion.celebrations.confirmationCliente
  CORRESPONDANCE['motion.celebrations.journeeBouclee'] = wiggy.motion.celebrations.journeeBouclee

  /**
   * Les écarts VOULUS au livrable de Design, un par ligne, avec leur motif.
   *
   * Un écart non listé ici reste une divergence et fait échouer le test : c'est
   * tout l'intérêt du garde-fou. Ce qui est listé a été mesuré et tranché, et
   * la valeur de Design reste lisible dans `reference/design-v2.json` pour que
   * l'écart se voie.
   */
  const DEROGATIONS: Record<string, string> = {
    'color.derived.inkMuted':
      'Tranché le 03/09 : 55 % mesure 3,83:1 sur la crème, sous le seuil AA de 4,5. ' +
      'Porté à 65 %, soit 5,21:1. Une pro lit son téléphone dehors entre deux clientes.',
  }

  const manquantes: string[] = []
  const divergentes: string[] = []
  for (const [chemin, valeurDesign] of feuilles(D)) {
    if (!(chemin in CORRESPONDANCE)) {
      manquantes.push(chemin)
      continue
    }
    const attendu = CORRESPONDANCE[chemin]
    if (attendu === '§') continue
    if (chemin in DEROGATIONS) {
      // Une dérogation qui ne dévie plus n'a plus de raison d'être : elle doit
      // se retirer, sans quoi la liste devient un cimetière que personne ne
      // relit.
      assert.notEqual(
        norm(attendu),
        norm(valeurDesign),
        `${chemin} est listé en dérogation mais suit le livrable design : retire la ligne`,
      )
      continue
    }
    if (norm(attendu) !== norm(valeurDesign)) {
      divergentes.push(`${chemin} : design ${String(valeurDesign)} · ici ${String(attendu)}`)
    }
  }

  assert.deepEqual(
    manquantes,
    [],
    `clés design sans correspondance :\n  ${manquantes.join('\n  ')}`,
  )
  assert.deepEqual(divergentes, [], `valeurs divergentes :\n  ${divergentes.join('\n  ')}`)
})

test('plus aucun token provisoire — les trois états sont ratifiés', () => {
  const provisoires = Object.entries(wiggy.couleur)
    .filter(([, v]) => '$provisoire' in v)
    .map(([k]) => k)
  assert.deepEqual(provisoires, [])
  assert.equal(couleurs.actionSurvol, '#A81C4E')
  assert.equal(couleurs.actionPressee, '#8F1A44')
  assert.equal(couleurs.pruneSurvol, '#58254C')
})
