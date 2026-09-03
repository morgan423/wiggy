// D3 — un seul produit logique, deux enveloppes.
//
// La logique métier, le copy et les jetons vivent dans les packages communs.
// Une enveloppe (`apps/web`, `apps/pro`) ne porte que le rendu et les capacités
// de sa plateforme. Ce script rend la règle exécutable : « chaque écran
// construit hors des packages communs est un écran à réécrire le jour du
// natif », et on en construit tous les jours.
//
// LE CRITÈRE, choisi parce qu'il est mécanique et sans jugement :
// un module d'une enveloppe est PORTABLE si tout ce qu'il importe est
// portable — un package `@wiggy/*`, un module natif de Node, ou un autre module
// portable de la même enveloppe. Un module portable ne dépend d'aucune
// plateforme : il tournerait tel quel dans React Native. S'il est portable et
// qu'il exporte quelque chose, c'est de la logique, et sa place est dans un
// package commun.
//
// Ce que le critère NE prétend pas être : une mesure de « métier ». Un module
// portable peut être un utilitaire anodin. Mais l'inverse est vrai et c'est ce
// qui compte : de la logique métier est nécessairement portable, donc rien ne
// lui échappe.
//
// LA DETTE EXISTANTE EST INVENTORIÉE, pas ignorée : `docs/architecture-dette.md`
// liste ce qui est là aujourd'hui. Le script échoue sur tout ce qui n'y est pas.
// L'inventaire ne peut donc que se réduire, jamais grandir en silence.
import { readFileSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Un import est portable s'il ne suppose aucune plateforme. */
function importPortable(specificateur) {
  if (specificateur.startsWith('@wiggy/')) return true
  if (specificateur.startsWith('node:')) return true
  return null // relatif ou alias : à résoudre
}

const IMPORT = /^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gm
const IMPORT_NU = /^\s*import\s+['"]([^'"]+)['"]/gm
const EXPORTE = /^\s*export\s/m

function importsDe(contenu) {
  const sortie = []
  for (const motif of [IMPORT, IMPORT_NU]) {
    motif.lastIndex = 0
    let m
    while ((m = motif.exec(contenu))) sortie.push(m[1])
  }
  return sortie
}

const fichiers = new Map()
for await (const f of glob('apps/*/src/**/*.{ts,tsx}', { cwd: racine })) {
  const chemin = join(racine, f)
  fichiers.set(chemin, readFileSync(chemin, 'utf8'))
}

/** Résout un import relatif ou aliasé vers un fichier connu, ou `null`. */
function resoudre(depuis, specificateur) {
  let base
  if (specificateur.startsWith('@/')) {
    const app = depuis.slice(0, depuis.indexOf('/src/') + 5)
    base = join(app, specificateur.slice(2))
  } else if (specificateur.startsWith('.')) {
    base = resolve(dirname(depuis), specificateur)
  } else {
    return null
  }
  for (const suffixe of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    if (fichiers.has(base + suffixe)) return base + suffixe
  }
  return null
}

/**
 * Portabilité, par point fixe : on part de « tout est portable » et on retire
 * tant que quelque chose bouge. Un cycle d'imports entre deux modules purs
 * reste donc portable, ce qui est juste.
 */
const portable = new Map([...fichiers.keys()].map((f) => [f, true]))
for (const [chemin, contenu] of fichiers) {
  // Du JSX, c'est du rendu : c'est le travail légitime d'une enveloppe.
  if (chemin.endsWith('.tsx')) portable.set(chemin, false)
  if (!EXPORTE.test(contenu)) portable.set(chemin, false)
}
let bouge = true
while (bouge) {
  bouge = false
  for (const [chemin, contenu] of fichiers) {
    if (!portable.get(chemin)) continue
    for (const specificateur of importsDe(contenu)) {
      const connu = importPortable(specificateur)
      if (connu === true) continue
      const cible = resoudre(chemin, specificateur)
      // Un import qui ne résout ni vers `@wiggy/*` ni vers un module de
      // l'enveloppe vient de l'extérieur : next, react, supabase, zod…
      if (cible === null || !portable.get(cible)) {
        portable.set(chemin, false)
        bouge = true
        break
      }
    }
  }
}

const trouves = [...portable.entries()]
  .filter(([, p]) => p)
  .map(([chemin]) => relative(racine, chemin))
  .sort()

/** L'inventaire de la dette : ce qui est là et qu'on sait devoir déplacer. */
const INVENTAIRE = join(racine, 'docs/architecture-dette.md')
const inventaire = new Set(
  readFileSync(INVENTAIRE, 'utf8')
    .split('\n')
    .map((l) => l.match(/^-\s+`([^`]+)`/)?.[1])
    .filter((v) => typeof v === 'string'),
)

const nouveaux = trouves.filter((f) => !inventaire.has(f))
const disparus = [...inventaire].filter((f) => !trouves.includes(f))

if (disparus.length > 0) {
  console.log(
    `\n${disparus.length} ligne(s) de l’inventaire n’ont plus lieu d’être, retire-les de docs/architecture-dette.md :`,
  )
  for (const f of disparus) console.log(`  · ${f}`)
}

if (nouveaux.length > 0) {
  console.error('\nD3 : de la logique portable vit dans une enveloppe.')
  console.error('Sa place est dans packages/core, packages/api ou packages/copy.')
  for (const f of nouveaux) console.error(`  ✖ ${f}`)
  console.error(
    '\nSi le déplacement ne peut pas se faire tout de suite, la ligne s’ajoute à\n' +
      'docs/architecture-dette.md AVEC son motif. Un inventaire se réduit, il ne grandit pas.\n',
  )
  process.exit(1)
}

console.log(
  `\nD3 : ${String(fichiers.size)} fichiers d’enveloppe contrôlés, ` +
    `${String(trouves.length)} module(s) portable(s), tous inventoriés.`,
)

// ── L'AMPLEUR, mesurée et non bloquante ───────────────────────────────────
//
// Le contrôle ci-dessus ne voit que les modules TOTALEMENT portables. La vraie
// ampleur est ailleurs : dans le code qui mêle du domaine à un appel Supabase,
// et dans les fonctions d'aide déclarées au pied des écrans. Rien de tout cela
// n'est portable au sens strict, et tout cela serait pourtant à réécrire le
// jour du natif. On le compte pour que le chiffre existe, on ne le bloque pas.
const touchentLeDomaine = [...fichiers]
  .filter(([f]) => f.endsWith('.ts'))
  .filter(([, c]) => /@wiggy\/(core|api)/.test(c))
const aidesDEcran = [...fichiers]
  .filter(([f]) => f.endsWith('.tsx'))
  .map(([f, c]) => [f, (c.match(/^(?:async )?function [a-zA-Z]/gm) ?? []).length])
  .filter(([, n]) => n > 1)
const totalAides = aidesDEcran.reduce((somme, [, n]) => somme + Number(n), 0)

console.log(
  `Ampleur (indicatif, non bloquant) : ${String(touchentLeDomaine.length)} module(s) ` +
    `d’enveloppe touchent au domaine sans être portables (ils appellent la base), ` +
    `et ${String(totalAides)} fonction(s) d’aide vivent au pied de ` +
    `${String(aidesDEcran.length)} écrans.`,
)

if (disparus.length > 0) process.exit(1)
