// Inventaire des événements journalisables (B14).
//
// « Sans cette liste, personne ne peut savoir si le journal est complet, et il
// se videra de sens sans que ça se voie. »
//
// L'inventaire est GÉNÉRÉ et non rédigé : une liste tenue à la main diverge du
// code au premier ajout, et c'est précisément la dérive qu'elle est censée
// rendre visible. Le registre des événements vient de `@wiggy/core`, les points
// d'appel viennent d'une recherche dans les sources.
//
// Il ÉCHOUE si un événement dont la fonctionnalité existe n'est journalisé
// nulle part : c'est la règle permanente de CLAUDE.md rendue exécutable.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'
import { EVENEMENTS, REGLAGE_DU_KIND, pushParDefaut } from '../packages/core/src/journal.ts'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

// Où `journaliser({ kind: '…' })` est réellement appelé.
const appels = new Map()
for await (const f of glob('apps/*/src/**/*.{ts,tsx}', { cwd: racine })) {
  const chemin = join(racine, f)
  const contenu = readFileSync(chemin, 'utf8')
  if (!contenu.includes('journaliser(')) continue
  const lignes = contenu.split('\n')
  lignes.forEach((ligne, i) => {
    const m = /kind:\s*(?:'([a-z_]+)'|[^,\n]*\?\s*'([a-z_]+)'\s*:\s*'([a-z_]+)')/.exec(ligne)
    if (!m) return
    for (const kind of [m[1], m[2], m[3]].filter(Boolean)) {
      const cle = REGLAGE_DU_KIND[kind]
      if (!cle) continue
      appels.set(cle, [...(appels.get(cle) ?? []), `${relative(racine, chemin)}:${i + 1}`])
    }
  })
}

const lignes = EVENEMENTS.map((e) => {
  const ou = appels.get(e.cle) ?? []
  const etat =
    e.attend !== null
      ? `⏳ en attente de ${e.attend}`
      : ou.length > 0
        ? '✅ branché'
        : '⚠️ branchable, PAS branché'
  const canaux = `journal toujours · badge par défaut · push ${pushParDefaut(e.nature) ? 'ACTIF' : 'inactif'}`
  return `| ${e.libelle} | \`${e.cle}\` | ${etat} | ${canaux} | ${ou.map((o) => `\`${o}\``).join('<br>') || '—'} |`
}).join('\n')

const doc = `# Inventaire des événements journalisables

> **Fichier généré** par \`npm run journal:inventaire\`, depuis le registre de
> \`packages/core/src/journal.ts\` et les appels réels à \`journaliser()\`.
> Ne pas le modifier à la main.

**Trois niveaux, et un seul n'est pas réglable.** Le **journal** reçoit tout, toujours, et ne se
désactive pas : un registre qu'on peut couper crée des trous invisibles, et la pro ne sait pas ce
qu'elle ne voit pas. Le **badge** et le **push** se règlent événement par événement.

**La règle des défauts de push**, qui tranche aussi les cas futurs : on interrompt quand
l'événement **change l'agenda ou attend une action**, jamais quand il est seulement **agréable à
savoir**. Un avis à cinq étoiles fait plaisir, il n'appelle rien, il n'a pas à interrompre une
prestation. Le défaut n'est pas saisi événement par événement, il est **calculé** depuis la nature
déclarée : c'est ce qui empêche la règle de se perdre au fil des ajouts.

| Événement | Clé | État | Canaux | Où c'est écrit |
|---|---|---|---|---|
${lignes}

## Ce que « en attente » veut dire

Ces événements ne sont **pas simulés**. Leur fonctionnalité n'existe pas : il n'y a ni avis (A7) ni
encaissement (B9) à journaliser. Leur ligne de réglage est visible et marquée « bientôt » plutôt
que masquée, parce qu'un réglage sans émetteur ment moins s'il l'annonce.

## La règle permanente

**Toute fonctionnalité qui produit un fait accompli intéressant la pro DOIT journaliser.** Et le
corollaire, qui protège la distinction de la planche 17a : **le journal reçoit des faits accomplis,
au passé, jamais des choses à faire.** Ce qui appelle une action va dans « À décider ».
`

writeFileSync(join(racine, 'docs', 'journal-evenements.md'), doc)

const oublies = EVENEMENTS.filter((e) => e.attend === null && !appels.has(e.cle))
console.log(
  `docs/journal-evenements.md : ${EVENEMENTS.length} événements, ` +
    `${EVENEMENTS.filter((e) => appels.has(e.cle)).length} branché(s), ` +
    `${EVENEMENTS.filter((e) => e.attend !== null).length} en attente de leur fonctionnalité.`,
)

if (oublies.length > 0) {
  console.error(
    `\n✖ Événement(s) dont la fonctionnalité existe mais qui ne sont journalisés nulle part : ` +
      `${oublies.map((e) => e.cle).join(', ')}.\n` +
      `  Une cloche qui n'affiche jamais rien apprend à ne pas être regardée.`,
  )
  process.exit(1)
}
