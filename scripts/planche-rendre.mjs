// Rend une planche ET l'écran correspondant en images, côte à côte.
//
// POURQUOI CE SCRIPT EXISTE. `CLAUDE.md` demande depuis toujours de « rendre la
// planche et l'écran, les comparer côte à côte ». Le 04/09, la home a été
// livrée sans que ce soit fait une seule fois : la planche avait été LUE au
// script — séquence des fonds, animations, chaînes de texte — jamais RENDUE.
// Six défauts sont passés, dont trois blocs invisibles et toutes les tailles de
// titre. Aucun n'était visible en relisant le code ; tous sautaient aux yeux sur
// l'image.
//
// La règle existait. Ce qui manquait était l'outil : tant qu'il fallait
// improviser un script jetable à chaque fois, l'étape se sautait. Une procédure
// qui demande du courage se saute ; une procédure qui demande une commande se
// suit.
//
// IL NE VÉRIFIE RIEN, ET C'EST VOULU. `planche:check` compare des propriétés
// qu'on sait nommer ; celui-ci sert à voir ce qu'on ne savait pas chercher.
// C'est l'œil qui trouve l'écart, le contrôle qui l'empêche de revenir — et
// tout écart trouvé ici doit finir en critère dans `planche-check.mjs`.
//
// USAGE
//   npm run planche:rendre -- 19a
//       les deux pages entières, dans captures/comparaison/.
//   npm run planche:rendre -- 19a 780 640 700
//       la même chose PLUS une paire de fenêtres de 700 px de haut, prise à
//       780 sur la planche et à 640 sur l'écran. Les deux décalages diffèrent
//       parce que la planche a sa chrome de maquette et que les hauteurs
//       dérivent en descendant : on les ajuste d'une paire à l'autre.
//
// Les images vont dans `captures/`, ignoré par git : ce sont des pièces de
// travail, elles ne se versionnent pas.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { lanceDirectement } from './garde.mjs'
import { preparerServeur } from './serveur-dev.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = join(racine, 'captures/comparaison')
const LARGEUR = 1400

/** Les planches et l'écran qu'elles décrivent. À compléter au fil des pages. */
const ECRANS = {
  '19a': '/',
  '19b': '/',
  '19c': '/',
}

/*
  ⚠️ LES DEUX RENDUS SONT FIGÉS DE LA MÊME MANIÈRE, sinon ils ne se comparent
  pas. Les fondus d'apparition au défilement laissent la moitié basse de la page
  BLANCHE sur une capture pleine page — le défaut a déjà coûté une comparaison
  entière. Et une animation en cours donne deux images différentes du même code.
*/
const FIGER = `
  .avant-apparition, .apparait {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  *, *::before, *::after { animation-play-state: paused !important; }
`

/*
  ⚠️ LES IMAGES DE LA PLANCHE SONT DES UUID SANS FICHIER EN REGARD.

  Le format d'export de Design référence ses images par identifiant opaque
  (`src="9dfa4e1a-…"`) et ne livre pas les binaires à côté. Rendue telle quelle,
  la planche sort avec huit images cassées : on perd exactement ce qu'on est
  venu voir, et on croit avoir comparé.

  On réécrit donc les `src` vers les avatars du dépôt, dans une copie de travail.
  ⚠️ CE QUE ÇA MONTRE ET CE QUE ÇA NE MONTRE PAS : la GÉOMÉTRIE est fidèle
  (tailles, cadrages, chevauchements, ombres), l'IDENTITÉ ne l'est pas — c'est un
  remplissage dans l'ordre du manifeste. La planche ne dit pas quel avatar va où,
  et ce script ne peut pas l'inventer. La question se pose à Design.
*/
function planchePreparee(numero) {
  const source = join(racine, `../../Design/planches/${numero}.html`)
  const html = readFileSync(source, 'utf8')
  const manifeste = JSON.parse(
    readFileSync(join(racine, 'apps/web/public/avatars/avatars.json'), 'utf8'),
  )
  const fichiers = manifeste.avatars.map((a) =>
    join(racine, `apps/web/public/avatars/${a.id}-320.webp`),
  )

  const connus = new Map()
  const rendu = html.replaceAll(/src="([0-9a-f-]{36})"/g, (entier, identifiant) => {
    // Les polices sont aussi des UUID, mais elles arrivent par le <link> Google
    // qui, lui, marche : on ne touche qu'aux `src` d'images.
    if (!connus.has(identifiant)) connus.set(identifiant, fichiers[connus.size % fichiers.length])
    return `src="file://${connus.get(identifiant)}"`
  })
  const copie = join(SORTIE, `.planche-${numero}-preparee.html`)
  writeFileSync(copie, rendu)
  return { adresse: `file://${copie}`, substituees: connus.size }
}

async function rendre(page, adresse, nom, fenetre) {
  await page.goto(adresse, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: FIGER })
  // Fraunces charge en différé : capturer trop tôt donne une page en substitut
  // de police, donc des largeurs de texte fausses et des retours à la ligne
  // qui n'existent pas.
  await page.evaluate(() => document.fonts.ready)
  /*
    ⚠️ LES IMAGES DIFFÉRÉES NE SE CHARGENT JAMAIS DANS UNE CAPTURE PLEINE PAGE.

    `next/image` pose `loading="lazy"` par défaut. Une capture pleine page rend
    tout le document sans jamais faire défiler la fenêtre : les images sous la
    ligne de flottaison restent à l'état vide, et la capture montre des trous
    là où la page est parfaitement juste. Constaté le 04/09 sur le trio du
    programme Ambassadrices, que j'ai cru absent alors qu'il était là.

    C'est le même piège que les fondus d'apparition et que les polices en
    différé, et il a la même conséquence : la comparaison devient fausse, et
    fausse dans le sens qui coûte le plus cher — elle accuse un code correct.

    On repasse donc chaque image en chargement immédiat et on attend qu'elles
    aient toutes abouti.
  */
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')]
    for (const image of images) image.loading = 'eager'
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((fini) => {
              image.addEventListener('load', fini, { once: true })
              image.addEventListener('error', fini, { once: true })
            }),
      ),
    )
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(SORTIE, `${nom}.png`), fullPage: true })
  if (fenetre) {
    await page.screenshot({
      path: join(SORTIE, `${nom}-fenetre.png`),
      fullPage: true,
      clip: { x: 0, y: fenetre.y, width: LARGEUR, height: fenetre.hauteur },
    })
  }
}

async function executer() {
  const [numero, yPlanche, yEcran, hauteur] = process.argv.slice(2)
  if (!numero || !(numero in ECRANS)) {
    console.error(
      `Usage : npm run planche:rendre -- <planche> [yPlanche yEcran hauteur]\n` +
        `Planches connues : ${Object.keys(ECRANS).join(', ')}`,
    )
    process.exit(1)
  }

  mkdirSync(SORTIE, { recursive: true })
  const serveur = await preparerServeur()
  let navigateur
  try {
    navigateur = await chromium.launch({ channel: 'chrome' })
    const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: 1000 } })

    const cadre = hauteur ? { hauteur: Number(hauteur) } : null
    const planche = planchePreparee(numero)
    if (planche.substituees > 0) {
      console.log(
        `\n⚠️ ${String(planche.substituees)} image(s) de la planche sont des UUID sans fichier : ` +
          `remplacées par des avatars du dépôt.\n   La géométrie est fidèle, PAS l'identité — ` +
          `la planche ne dit pas quel avatar va où.`,
      )
    }
    await rendre(
      page,
      planche.adresse,
      `planche-${numero}`,
      cadre && yPlanche ? { ...cadre, y: Number(yPlanche) } : null,
    )
    await rendre(
      page,
      `${serveur.base}${ECRANS[numero]}`,
      `ecran-${numero}`,
      cadre && yEcran ? { ...cadre, y: Number(yEcran) } : null,
    )
  } finally {
    await navigateur?.close().catch(() => undefined)
    serveur.arreter()
  }

  console.log(
    `\nRendus dans captures/comparaison/ :\n` +
      `   planche-${numero}.png   ← ce qui doit être\n` +
      `   ecran-${numero}.png     ← ce qui est\n` +
      (hauteur ? `   …-fenetre.png       ← la paire de régions à comparer\n` : '') +
      `\nMaintenant REGARDE-LES. Les ouvrir n'est pas les regarder, et lire le\n` +
      `code à la place ne montre ni un bloc invisible, ni une classe qui ne\n` +
      `peint pas, ni une marge posée hors mesure.\n`,
  )
}

if (lanceDirectement(import.meta.url)) await executer()
