// Extrait le micro-copy du board design, bloc par bloc, verbatim.
//
// Le board est une référence de rendu, mais son contenu est ratifié : ces
// chaînes sont la source du copy deck. L'extraction est automatique pour
// qu'on puisse la rejouer quand un nouveau board arrive, et comparer.
// `npm run copy:extract`
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(racine, 'packages/copy/reference-board-phase2.html'), 'utf8')

// Le board sépare ses écrans par des pastilles « 3a », « 10c »… On découpe
// dessus, en gardant l'ordre d'apparition.
const texte = html
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, '\n')

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')

const lignes = texte
  .split('\n')
  .map((l) => decode(l).replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const blocs = {}
let courant = null
for (const l of lignes) {
  if (/^\d{1,2}[a-z]$/.test(l)) {
    courant = l
    blocs[courant] ??= []
    continue
  }
  if (courant) blocs[courant].push(l)
}

// On retire les doublons consécutifs (le board répète ses libellés dans le
// sommaire puis dans le bloc lui-même) et les fragments d'une seule lettre.
const nettoyer = (chaines) => {
  const sortie = []
  for (const c of chaines) {
    if (c.length < 2) continue
    if (sortie.at(-1) === c) continue
    sortie.push(c)
  }
  return sortie
}

mkdirSync(join(racine, 'packages/copy/source'), { recursive: true })
const resume = {}
for (const [bloc, chaines] of Object.entries(blocs)) {
  const propres = nettoyer(chaines)
  resume[bloc] = propres.length
  writeFileSync(
    join(racine, 'packages/copy/source', `${bloc}.json`),
    JSON.stringify({ bloc, chaines: propres }, null, 2) + '\n',
  )
}
console.log(
  Object.entries(resume)
    .map(([b, n]) => `  ${b.padEnd(4)} ${n} chaînes`)
    .join('\n'),
)
