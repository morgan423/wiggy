// Vérifie que tout texte rédigé hors board est déclaré dans MANQUES.md.
// Sans ça, une chaîne inventée se glisse dans le produit sans que personne
// ne sache qu'elle attend une relecture. `npm run copy:manques`
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossier = join(racine, 'packages/copy/ecrans')
const manques = readFileSync(join(racine, 'packages/copy/MANQUES.md'), 'utf8')

const nonDeclares = []
for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.json'))) {
  const ecran = JSON.parse(readFileSync(join(dossier, fichier), 'utf8'))
  const aEcrire = ecran.$aEcrire ?? {}
  for (const [cle, valeur] of Object.entries(aEcrire)) {
    if (cle.startsWith('$')) continue
    const reference = `${fichier.replace('.json', '')}.$aEcrire.${cle}`
    if (!manques.includes(reference)) nonDeclares.push(`${reference} : « ${valeur} »`)
  }
}

if (nonDeclares.length) {
  console.error('Textes rédigés hors board et non déclarés dans MANQUES.md :')
  for (const n of nonDeclares) console.error(`  ✖ ${n}`)
  process.exit(1)
}
console.log('Copy deck : tout texte rédigé hors board est déclaré.')
