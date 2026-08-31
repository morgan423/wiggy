// Génère wiggy-tokens.css depuis wiggy-tokens.json.
// Le JSON est la source de vérité : le CSS ne se modifie jamais à la main,
// sinon les deux divergent et le thème cesse d'être unique.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = dirname(fileURLToPath(import.meta.url))
const t = JSON.parse(readFileSync(join(racine, 'wiggy-tokens.json'), 'utf8'))

const lignes = []
const pousser = (nom, valeur) => lignes.push(`  --${nom}: ${valeur};`)

lignes.push('  /* Couleurs sémantiques */')
for (const [cle, { valeur, nom, usage }] of Object.entries(t.couleur)) {
  lignes.push(`  /* ${nom} — ${usage} */`)
  pousser(`color-${kebab(cle)}`, valeur)
}

lignes.push('', '  /* Texte */')
for (const [cle, { valeur }] of Object.entries(t.texte))
  pousser(`color-texte-${kebab(cle)}`, valeur)

lignes.push('', '  /* Traits */')
for (const [cle, { valeur }] of Object.entries(t.trait))
  pousser(`color-trait-${kebab(cle)}`, valeur)

lignes.push('', '  /* Polices */')
pousser('font-display', `var(--police-display), ${t.police.display.repli}`)
pousser('font-sans', `var(--police-ui), ${t.police.ui.repli}`)
pousser('wonk', t.police.wonk.valeur)

lignes.push('', '  /* Échelle typographique — tailles design, rendues responsives */')
for (const [nom, e] of Object.entries(t.typo)) {
  // La taille design est le PLAFOND : 92 px sur un écran de 375 px déborderait.
  // Le plancher est fixé à 60 % pour statement et display, 100 % en dessous
  // (un corps de 16 px n'a pas à rétrécir).
  const plafond = e.taille
  const plancher = plafond >= 40 ? Math.round(plafond * 0.6) : plafond
  const taille =
    plancher === plafond
      ? `${plafond / 16}rem`
      : `clamp(${plancher / 16}rem, ${(plafond / 8).toFixed(1)}vw, ${plafond / 16}rem)`
  pousser(`text-${kebab(nom)}`, taille)
  pousser(`leading-${kebab(nom)}`, String(e.interligne))
  pousser(`font-weight-${kebab(nom)}`, String(e.graisse))
}

lignes.push('', '  /* Points de rupture */')
for (const [cle, v] of Object.entries(t.breakpoint)) pousser(`breakpoint-${cle}`, `${v}px`)

lignes.push('', '  /* Rayons — la rondeur est le motif structurel */')
for (const [cle, v] of Object.entries(t.radius)) {
  pousser(`radius-${kebab(cle)}`, cle === 'pilule' ? '9999px' : `${v}px`)
}

lignes.push('', '  /* Espacements */')
for (const [cle, v] of Object.entries(t.espacement)) pousser(`spacing-${cle}`, `${v / 16}rem`)

lignes.push('', '  /* Ombres */')
for (const [cle, { valeur }] of Object.entries(t.ombre)) pousser(`shadow-${kebab(cle)}`, valeur)

lignes.push('', '  /* Motion — valeurs du livrable design */')
for (const [cle, ms] of Object.entries(t.motion.duree)) pousser(`duree-${kebab(cle)}`, `${ms}ms`)
for (const [cle, courbe] of Object.entries(t.motion.easing)) pousser(`courbe-${kebab(cle)}`, courbe)
pousser('tap-scale', String(t.motion.tapScale))

const css = `/* ─────────────────────────────────────────────────────────────
 * Wiggy — thème unique de l'app.
 *
 * ⚠️ FICHIER GÉNÉRÉ par packages/tokens/build.mjs.
 * Toute modification se fait dans wiggy-tokens.json, puis
 * \`npm run tokens:build\`. Éditer ce fichier le fera diverger de la
 * source et le thème cessera d'être unique.
 *
 * Direction : ${t.$direction}
 * ───────────────────────────────────────────────────────────── */

@theme {
${lignes.join('\n')}
}
`

writeFileSync(join(racine, 'wiggy-tokens.css'), css)
console.log(
  `wiggy-tokens.css — ${Object.keys(t.couleur).length} couleurs, ${Object.keys(t.espacement).length} espacements`,
)

function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
