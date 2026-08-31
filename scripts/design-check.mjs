// Contrôle des règles invisibles du design system.
//
// Ces règles ne sont écrites nulle part dans le rendu : elles ne survivent pas
// à la bonne volonté. Ce script les rend vérifiables. `npm run design:check`.
import { readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const violations = []
const avertissements = []

const signaler = (fichier, ligne, regle, detail) =>
  violations.push({ fichier: relative(racine, fichier), ligne, regle, detail })

const fichiers = []
for await (const f of glob('apps/*/src/**/*.{tsx,ts,css}', { cwd: racine })) {
  fichiers.push(join(racine, f))
}

/** Tailwind : tailles de texte strictement inférieures à 20 px. */
const PETITES_TAILLES = ['text-xs', 'text-sm', 'text-base', 'text-lg']
const CLASSES_SERIF = ['statement', 'display', 'titre', 'font-display']

for (const chemin of fichiers) {
  const contenu = readFileSync(chemin, 'utf8')
  const lignes = contenu.split('\n')
  const estAgenda = /\/(agenda|tournee)\//.test(chemin)
  const estEspacePro = /\/app\/app\//.test(chemin)
  const estGlobals = chemin.endsWith('globals.css')

  lignes.forEach((ligne, i) => {
    const n = i + 1
    const classes = [...ligne.matchAll(/className="([^"]*)"/g)].map((m) => m[1]).join(' ')
    const aSerif = CLASSES_SERIF.some((c) =>
      new RegExp(`(^|[\\s"'\`])${c}([\\s"'\`]|$)`).test(classes),
    )

    // ① Fraunces jamais sous 20 px.
    if (aSerif && PETITES_TAILLES.some((t) => classes.includes(t))) {
      signaler(
        chemin,
        n,
        'serif-sous-20px',
        `serif combinée à ${PETITES_TAILLES.find((t) => classes.includes(t))}`,
      )
    }

    // ② Fraunces jamais dans l'agenda — illisible en petit, en plein soleil.
    if (aSerif && estAgenda) {
      signaler(chemin, n, 'serif-dans-agenda', 'la serif n’a pas sa place dans l’agenda')
    }

    // ③ WONK réservé aux statements, qui sont eux-mêmes réservés au site.
    if (/\bstatement\b/.test(classes) && estEspacePro) {
      signaler(
        chemin,
        n,
        'wonk-hors-site',
        'la classe `statement` (axe WONK) est réservée au site marketing',
      )
    }
    if (/WONK["']?\s*1/.test(ligne) && !estGlobals) {
      signaler(chemin, n, 'wonk-en-dur', 'l’axe WONK ne se pose que par la classe `statement`')
    }

    // ④ Zone tactile de 44 px sur tout élément interactif.
    if (/<(button|Link)\b/.test(ligne) || /type="submit"/.test(ligne)) {
      const maigre = /\bpy-(0|0\.5|1|1\.5|2)\b/.test(classes)
      if (maigre && !classes.includes('tactile')) {
        signaler(chemin, n, 'zone-tactile', 'élément interactif sous 44 px sans classe `tactile`')
      }
    }

    // ⑤ Zéro animation ambiante.
    const ambiante = ligne.match(/\banimate-(pulse|spin|bounce|ping)\b/)
    if (ambiante) {
      signaler(
        chemin,
        n,
        'animation-ambiante',
        `${ambiante[0]} — l’app s’ouvre trente fois par jour`,
      )
    }

    // ⑥ Toute animation vit dans la feuille globale, sous garde reduced-motion.
    if (/@keyframes/.test(ligne) && !estGlobals) {
      signaler(chemin, n, 'keyframes-hors-globals', 'les animations se déclarent dans globals.css')
    }

    // ⑦ Double registre : le pro est tutoyé, la cliente vouvoyée.
    // Signalé, pas bloquant : un écran pro peut légitimement prévisualiser ce
    // que verra la cliente (réglages de paiement). Marqueur : registre:cliente
    if (
      estEspacePro &&
      /\b(Vous|Votre|Vos)\b/.test(ligne) &&
      !contenu.includes('registre:cliente')
    ) {
      avertissements.push({
        fichier: relative(racine, chemin),
        ligne: n,
        regle: 'registre',
        detail: 'vouvoiement dans l’espace pro (tutoiement attendu)',
      })
    }
  })
}

// ⑨ Aucun tiret cadratin dans ce que lisent les utilisateurs.
//
// Le cadratin (U+2014) et le demi-cadratin (U+2013) n'ont pas leur place dans
// le contenu du produit : ils fatiguent à l'écran, se lisent mal en petit
// corps, et cassent la lecture à voix haute des lecteurs d'écran. La
// ponctuation classique dit la même chose : deux-points pour introduire,
// virgule pour l'incise, parenthèses pour l'aparté, point pour trancher.
//
// Le CODE n'est pas concerné : opérateurs et commentaires techniques gardent
// leur liberté. Seul compte ce qui s'affiche.
const CADRATINS = /[\u2014\u2013]/

function sansCommentaires(lignes) {
  const propres = []
  let dansBloc = false
  for (const ligne of lignes) {
    const nu = ligne.trim()
    if (dansBloc) {
      if (nu.includes('*/')) dansBloc = false
      propres.push('')
      continue
    }
    if (nu.startsWith('//') || nu.startsWith('*')) {
      propres.push('')
      continue
    }
    if (nu.startsWith('/*') || nu.startsWith('{/*')) {
      if (!nu.includes('*/')) dansBloc = true
      propres.push('')
      continue
    }
    // Commentaire de fin de ligne, hors adresse (« https:// »).
    propres.push(ligne.replace(/(?<!:)\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, ''))
  }
  return propres
}

for (const chemin of fichiers) {
  if (chemin.endsWith('.css')) continue
  const propres = sansCommentaires(readFileSync(chemin, 'utf8').split('\n'))
  propres.forEach((ligne, i) => {
    if (CADRATINS.test(ligne)) {
      signaler(
        chemin,
        i + 1,
        'tiret-cadratin',
        'remplacer par deux-points, virgule, parenthèses ou point selon le sens',
      )
    }
  })
}

// Les documents du dépôt sont lus par des humains : même règle.
for (const doc of [
  'CLAUDE.md',
  'docs/architecture.md',
  'docs/decisions.md',
  'docs/matrice-acces.md',
]) {
  const chemin = join(racine, doc)
  readFileSync(chemin, 'utf8')
    .split('\n')
    .forEach((ligne, i) => {
      if (CADRATINS.test(ligne)) {
        signaler(
          chemin,
          i + 1,
          'tiret-cadratin',
          'ponctuation classique attendue dans les documents',
        )
      }
    })
}

// ⑧ La garde reduced-motion doit exister, sans exception.
const globals = readFileSync(join(racine, 'apps/web/src/app/globals.css'), 'utf8')
if (!globals.includes('prefers-reduced-motion')) {
  signaler(
    join(racine, 'apps/web/src/app/globals.css'),
    0,
    'reduced-motion-absent',
    'aucune garde `prefers-reduced-motion`',
  )
}
for (const celebration of ['celebration-carte', 'bouclee-titre']) {
  const bloc = globals.slice(globals.indexOf('prefers-reduced-motion'))
  if (!bloc.includes(celebration)) {
    signaler(
      join(racine, 'apps/web/src/app/globals.css'),
      0,
      'celebration-non-degradee',
      `\`${celebration}\` n’est pas neutralisée sous prefers-reduced-motion`,
    )
  }
}

for (const a of avertissements) {
  console.warn(`  ⚠ ${a.fichier}:${a.ligne} — ${a.regle} : ${a.detail}`)
}
if (violations.length === 0) {
  console.log(`\nRègles invisibles : ${fichiers.length} fichiers contrôlés, aucune violation.`)
  if (avertissements.length) console.log(`${avertissements.length} avertissement(s) de registre.`)
  process.exit(0)
}
console.error('\nViolations des règles invisibles :')
for (const v of violations) console.error(`  ✖ ${v.fichier}:${v.ligne} — ${v.regle} : ${v.detail}`)
process.exit(1)
