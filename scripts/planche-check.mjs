// Rend la PLANCHE opposable : elle cesse d'être une référence qu'on consulte
// pour devenir une règle qui échoue.
//
// POURQUOI CE CONTRÔLE EXISTE. Les textes de la home sont exacts parce qu'un
// script les extrait de la planche et qu'un test les compare. La COMPOSITION,
// elle, a dérivé sur presque chaque bande — parce que rien ne la comparait
// jamais. C'est la seule différence entre les deux, et c'est la doctrine du
// dépôt : une règle qu'on peut exécuter bat une règle qu'on répète.
//
// CE QU'IL COMPARE, ET POURQUOI PAS PLUS.
//
// Un diff d'image intégral serait plus ambitieux et moins utile : la planche
// est une maquette avec sa propre chrome de navigateur et ses annotations que
// la page n'a pas, les polices chargent à des instants différents, et
// l'antialiasing varie d'une machine à l'autre. Il échouerait pour des raisons
// qui ne sont pas des défauts, et un contrôle qui crie au loup finit désactivé.
//
// La SÉQUENCE DES FONDS DE BANDE, elle, se compare EXACTEMENT : c'est une
// liste ordonnée de couleurs, symbolique, insensible au rendu. Et c'est
// précisément la propriété qui a dérivé — elle attrape la totalité du défaut
// du 04/09, où onze bandes sur quatorze avaient le mauvais fond.
//
// S'Y AJOUTENT TROIS CONTRÔLES ÉCRITS APRÈS COUP, chacun sur un défaut réel du
// 04/09 que la version précédente laissait passer sans broncher :
//
//   ④ un bloc arrondi de la couleur exacte de son fond est INVISIBLE ;
//   ⑤ la largeur utile d'une bande dit si les marges sont dans la mesure ;
//   ⑥ les tailles de texte de la planche sont exigées, mesurées sur le rendu.
//
// Le point commun des trois est ce qui les rendait indétectables à la relecture :
// dans les trois cas le code était juste à lire et faux à l'écran. Une classe
// posée qui ne peint rien, une marge écrite qui tombe hors mesure, une carte
// déclarée qu'on ne voit pas. Aucun ne fait échouer quoi que ce soit tout seul.
//
// S'y ajoute le MOUVEMENT, pour une raison précise : la planche que j'avais lue
// déclarait des animations dont les keyframes avaient été perdus à
// l'extraction. Une animation qui ne s'applique pas ne se voit pas, ni sur la
// planche ni sur la page. On vérifie donc que le ruban défile vraiment.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { lanceDirectement, env, exigerDeveloppement } from './garde.mjs'
import { preparerServeur } from './serveur-dev.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLANCHE = join(racine, '../../Design/planches/19a.html')
const LARGEUR = 1280

/** Les bandes de la page, dans l'ordre. Les noms viennent de `data-bande`. */
const BANDES = [
  'entete',
  'heros',
  'bandeau',
  'probleme',
  'tournee',
  'fonctions',
  'inclusivite',
  'etapes',
  'avis',
  'prix',
  'ambassadrices',
  'faq',
  'demo',
  'final',
  'pied',
]

/**
 * La séquence des fonds, relevée SUR LA PLANCHE.
 *
 * On lit le HTML plutôt qu'une liste recopiée : une liste recopiée est une
 * seconde source de vérité, et c'est exactement ce que ce contrôle existe pour
 * empêcher. Le jour où Design change une bande, la planche change et le
 * contrôle tombe tout seul.
 */
function fondsDeLaPlanche() {
  const html = readFileSync(PLANCHE, 'utf8')
  const debut = html.indexOf('id="19a"')
  const corps = html.slice(debut)
  const fonds = []
  let profondeur = 0
  let dansLaPage = false

  for (const m of corps.matchAll(/<div\b([^>]*)>|<\/div>/g)) {
    if (m[0] === '</div>') {
      profondeur -= 1
      continue
    }
    const fond = /background(?:-color)?:\s*([^;"]+)/.exec(m[1])?.[1].trim()
    // Le conteneur de page : le div crème qui porte les bandes.
    if (profondeur === 1 && fond === '#FBEEE6') {
      dansLaPage = true
      profondeur += 1
      continue
    }
    // Un fond absent vaut celui du conteneur : la bande repose sur la crème.
    if (dansLaPage && profondeur === 2) fonds.push(fond ?? '#FBEEE6')
    profondeur += 1
  }
  return fonds.map(enRgb)
}

/** `#45173C` devient `rgb(69, 23, 60)`, la forme que rend le navigateur. */
function enRgb(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return `rgb(${String((n >> 16) & 255)}, ${String((n >> 8) & 255)}, ${String(n & 255)})`
}

async function executer() {
  const valeurs = env()
  exigerDeveloppement(valeurs)
  const attendus = fondsDeLaPlanche()
  const serveur = await preparerServeur(3013)
  const echecs = []
  let compares = 0
  let navigateur

  try {
    navigateur = await chromium.launch({ channel: 'chrome' })
    const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: 900 } })
    await page.goto(serveur.base, { waitUntil: 'networkidle' })

    const obtenus = await page.evaluate(() =>
      [...document.querySelectorAll('[data-bande]')].map((n) => ({
        nom: n.getAttribute('data-bande'),
        fond: getComputedStyle(n).backgroundColor,
      })),
    )

    if (obtenus.length !== attendus.length) {
      echecs.push(
        `La planche compte ${String(attendus.length)} bandes, la page en déclare ` +
          `${String(obtenus.length)}. Une bande a été ajoutée, retirée, ou n'a pas de ` +
          '`data-bande`.',
      )
    } else {
      obtenus.forEach((bande, i) => {
        if (bande.fond !== attendus[i]) {
          echecs.push(
            `bande « ${bande.nom ?? String(i)} » : la planche la veut ${attendus[i]}, ` +
              `la page la rend ${bande.fond}.`,
          )
        }
      })
      // Le nom déclaré doit suivre l'ordre attendu : deux bandes interverties
      // avec le même fond passeraient sinon inaperçues.
      const ordre = obtenus.map((b) => b.nom).join(' > ')
      if (ordre !== BANDES.join(' > ')) {
        echecs.push(
          `L'ordre des bandes a changé :\n     ${ordre}\n     au lieu de\n     ${BANDES.join(' > ')}`,
        )
      }
    }

    /*
      LE MOUVEMENT SE MESURE, IL NE SE DÉCLARE PAS.

      Premier écrit, ce contrôle lisait `animationName` et le comparait à
      `none`. Éprouvé en supprimant les keyframes du ruban — le défaut EXACT
      qui a produit ce lot — il n'a rien vu : `getComputedStyle` rend le nom
      DÉCLARÉ même quand aucun `@keyframes` ne lui correspond. Une animation
      fantôme se déclare exactement comme une vraie.

      On échantillonne donc l'effet à deux instants, et on exige qu'il ait
      changé. C'est la seule vérification qui ne puisse pas être trompée par une
      déclaration sans contenu.
    */
    const mouvement = await page.evaluate(async () => {
      const releve = () => ({
        ruban: getComputedStyle(document.querySelector('.ruban-defilant') ?? document.body)
          .transform,
        opacites: [
          ...document.querySelectorAll('.pulsation, .pulsation-courte, .pulsation-decalee'),
        ].map((n) => getComputedStyle(n).opacity),
        vitrines: [...document.querySelectorAll('.ecran-vitrine')].map(
          (n) => getComputedStyle(n).opacity,
        ),
      })
      const present = document.querySelector('.ruban-defilant') !== null
      const avant = releve()
      await new Promise((r) => setTimeout(r, 700))
      const apres = releve()
      return { present, avant, apres }
    })

    if (!mouvement.present) {
      echecs.push('Le ruban défilant est absent de la page.')
    } else if (mouvement.avant.ruban === mouvement.apres.ruban) {
      echecs.push(
        'Le ruban NE BOUGE PAS. Sa transformation est identique à 700 ms d’intervalle : ' +
          'ses keyframes manquent, ou l’animation ne s’applique pas.',
      )
    }

    /*
      Les deux CARROUSELS d'interface. Même exigence que le ruban : on mesure
      l'effet, jamais la déclaration. Trois écrans par carrousel, trois points,
      et au moins un des deux doit bouger pendant l'échantillon — à 4,5 s par
      écran, 700 ms ne suffisent pas à garantir que TOUS aient changé.
    */
    const vitrines = await page.evaluate(() => ({
      ecrans: document.querySelectorAll('.ecran-vitrine').length,
      points: document.querySelectorAll('.point-vitrine').length,
    }))
    if (vitrines.ecrans !== 6) {
      echecs.push(
        `${String(vitrines.ecrans)} écran(s) de vitrine sur les 6 de la planche 19a ` +
          '(trois dans le héros, trois dans la tournée).',
      )
    }
    if (vitrines.points !== 6) {
      echecs.push(`${String(vitrines.points)} point(s) de vitrine sur les 6 attendus.`)
    }

    const bougent = mouvement.apres.opacites.filter(
      (o, i) => o !== mouvement.avant.opacites[i],
    ).length
    if (mouvement.avant.opacites.length < 3) {
      echecs.push(
        `${String(mouvement.avant.opacites.length)} élément(s) portent une pulsation, ` +
          'la planche 19a en compte 3.',
      )
    } else if (bougent === 0) {
      echecs.push('Aucune pulsation ne varie : les keyframes manquent, ou elles sont inertes.')
    }

    /*
      LES CARROUSELS SE MESURENT AUTREMENT QUE LE RUBAN.

      Échantillonner leur opacité ne marche pas : la courbe est PLATE pendant
      l'essentiel du cycle (0 à 26 %, puis 33 à 93 %), et deux relevés espacés
      de 700 ms tombent presque toujours dans la même plage. Le contrôle serait
      capricieux, et un contrôle capricieux finit ignoré.

      On interroge donc l'animation elle-même : `getAnimations()` ne rend RIEN
      quand les keyframes n'existent pas — c'est ce qui manquait au premier
      contrôle du ruban — et son `currentTime` avance si, et seulement si, elle
      tourne. Indépendant de la phase, donc jamais capricieux.

      S'y ajoute la vérification des DÉCALAGES : trois écrans qui partiraient
      ensemble donneraient une pile immobile, techniquement animée.
    */
    const carrousels = await page.evaluate(async () => {
      const ecrans = [...document.querySelectorAll('.ecran-vitrine')]
      const anims = ecrans.map((e) => e.getAnimations()[0] ?? null)
      const avant = anims.map((a) => (a ? Number(a.currentTime) : null))
      const retards = ecrans.map((e) => getComputedStyle(e).animationDelay)
      await new Promise((r) => setTimeout(r, 400))
      const apres = anims.map((a) => (a ? Number(a.currentTime) : null))
      return { sansAnimation: anims.filter((a) => a === null).length, avant, apres, retards }
    })
    if (carrousels.sansAnimation > 0) {
      echecs.push(
        `${String(carrousels.sansAnimation)} écran(s) de vitrine n'ont AUCUNE animation : ` +
          'leurs keyframes n’existent pas.',
      )
    } else if (!carrousels.apres.some((t, i) => t !== null && t > (carrousels.avant[i] ?? 0))) {
      echecs.push('Les carrousels ne tournent pas : leur temps d’animation n’avance pas.')
    }
    if (new Set(carrousels.retards).size < 3) {
      echecs.push(
        `Les écrans de vitrine ne sont pas décalés (${[...new Set(carrousels.retards)].join(', ')}) : ` +
          'ils se relaieraient tous en même temps, donc jamais.',
      )
    }
    /*
      ── ④ AUCUN BLOC N'A LA COULEUR DE SON FOND ────────────────────────────

      Le défaut du 04/09, et il s'est produit TROIS FOIS dans la même page :
      des cartes `bg-surface` posées sur une bande `bg-surface`, des rangées de
      carrousel de la couleur exacte de leur carte. Rien n'échoue, rien ne
      manque, la classe est là — le bloc est simplement invisible, et l'écran
      se lit comme du texte nu.

      La règle est structurelle et ne demande aucune connaissance de la
      planche : un bloc ARRONDI est un bloc qu'on a voulu voir. S'il a
      exactement la couleur de ce qu'il y a derrière et qu'aucun trait ne le
      détoure, il n'existe pas. Un conteneur de mise en page n'est pas arrondi,
      il n'est donc jamais concerné.
    */
    const invisibles = await page.evaluate(() => {
      const fondPeint = (n) => {
        for (let e = n; e; e = e.parentElement) {
          const f = getComputedStyle(e).backgroundColor
          if (f && f !== 'rgba(0, 0, 0, 0)' && f !== 'transparent') return f
        }
        return 'rgb(255, 255, 255)'
      }
      const trouves = []
      for (const e of document.querySelectorAll('*')) {
        const s = getComputedStyle(e)
        const rayon = Number.parseFloat(s.borderTopLeftRadius)
        const fond = s.backgroundColor
        if (!(rayon >= 12) || fond === 'rgba(0, 0, 0, 0)' || fond === 'transparent') continue
        // Un trait visible suffit à détourer : le bloc se voit malgré tout.
        if (Number.parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') continue
        if (e.parentElement && fond === fondPeint(e.parentElement)) {
          trouves.push(`${e.tagName.toLowerCase()}.${e.className.toString().slice(0, 40)}`)
        }
      }
      return trouves
    })
    for (const q of new Set(invisibles)) {
      echecs.push(`Bloc INVISIBLE — il a exactement la couleur de son fond : ${q}`)
    }

    /*
      ── ⑤ LA MESURE ET SES MARGES ─────────────────────────────────────────

      La planche pose une page de 1200 et met ses marges DEDANS : 56 px de part
      et d'autre, à l'intérieur de la boîte. J'avais posé les marges sur la
      bande pleine largeur, donc à l'extérieur : elles étaient mangées par le
      vide du navigateur et le contenu touchait les deux bords de la boîte. Les
      interfaces se collaient au bord droit, ce que Morgan a vu tout de suite.

      Un contrôle « le contenu est à plus de 56 px du bord de l'écran » aurait
      dit oui : il était à 100. On mesure donc la LARGEUR UTILE, qui ne peut
      pas mentir — 1200 moins les deux marges.
    */
    const mesures = await page.evaluate(() => {
      const releves = []
      for (const bande of document.querySelectorAll('[data-bande]')) {
        // Le ruban défile d'un bord à l'autre : il n'a pas de mesure.
        if (bande.dataset.bande === 'bandeau') continue
        const boite = bande.firstElementChild
        if (!boite) continue
        const s = getComputedStyle(boite)
        const utile =
          boite.clientWidth - Number.parseFloat(s.paddingLeft) - Number.parseFloat(s.paddingRight)
        releves.push({ nom: bande.dataset.bande, utile: Math.round(utile) })
      }
      return { releves, largeur: document.documentElement.clientWidth }
    })
    const utileAttendue = Math.min(1200, mesures.largeur) - 112
    for (const r of mesures.releves) {
      if (Math.abs(r.utile - utileAttendue) > 2) {
        echecs.push(
          `Bande « ${r.nom} » : largeur utile ${String(r.utile)} px au lieu de ` +
            `${String(utileAttendue)} (1200 moins 56 de marge de chaque côté, marges COMPRISES ` +
            'dans la mesure).',
        )
      }
    }

    /*
      ── ⑥ LES TAILLES DE TEXTE DE LA PLANCHE ──────────────────────────────

      Deux défauts silencieux le même jour, tous deux invisibles à la relecture
      du code :

      · `.titre` déclaré hors couche gagnait contre `text-[20px]`, et tous les
        titres de carte sortaient à 26 ;
      · des classes CALCULÉES (`text-[clamp(${...})]`) n'étaient produites par
        aucune feuille, Tailwind lisant la source sans l'exécuter — les titres
        retombaient sur leur palier par défaut.

      Dans les deux cas la classe est bien posée sur l'élément : l'inspecteur la
      montre, la relecture la valide, et elle ne peint rien. Seule la MESURE DU
      RENDU les attrape. On relève donc les tailles sur la planche et on les
      exige sur la page, texte par texte.

      Les textes ambigus — présents deux fois d'un côté ou de l'autre — sont
      écartés : on ne saurait pas lequel comparer, et un contrôle qui devine
      finit par se tromper.
    */
    const deLaPlanche = new Map()
    const planche = readFileSync(PLANCHE, 'utf8')
    for (const m of planche.matchAll(
      /font-family: Fraunces[^"]*?font-size: ([0-9.]+)px[^"]*"[^>]*>([^<]{4,80})</g,
    )) {
      const texte = m[2].replaceAll('&amp;', '&').trim()
      deLaPlanche.set(texte, deLaPlanche.has(texte) ? null : Number(m[1]))
    }
    const aComparer = [...deLaPlanche].filter(([, t]) => t !== null)
    const surLaPage = await page.evaluate((textes) => {
      const trouve = {}
      for (const [texte] of textes) {
        const noeuds = [...document.querySelectorAll('h1,h2,h3,p,span,div,li')].filter(
          (e) => e.textContent?.trim() === texte && e.children.length === 0,
        )
        if (noeuds.length === 1) {
          trouve[texte] = Number.parseFloat(getComputedStyle(noeuds[0]).fontSize)
        }
      }
      return trouve
    }, aComparer)
    for (const [texte, attendue] of aComparer) {
      const rendue = surLaPage[texte]
      if (rendue === undefined) continue
      compares += 1
      if (Math.abs(rendue - attendue) > 1) {
        echecs.push(
          `« ${texte.slice(0, 44)} » : ${String(Math.round(rendue))} px au lieu de ` +
            `${String(attendue)} px sur la planche.`,
        )
      }
    }
    if (compares < 8) {
      echecs.push(
        `Seuls ${String(compares)} textes ont pu être comparés à la planche : le contrôle des ` +
          'tailles ne couvre plus rien, il faut le réparer avant de le croire.',
      )
    }
  } finally {
    await navigateur?.close().catch(() => undefined)
    serveur.arreter()
  }

  if (echecs.length > 0) {
    console.error('\n✖ La home a dérivé de la planche 19a :')
    for (const e of echecs) console.error(`   ${e}`)
    console.error('\n  La planche fait foi. Corrige la page, pas le contrôle.\n')
    process.exit(1)
  }
  console.log(
    `Planche 19a : ${String(attendus.length)} bandes conformes, ${String(compares)} tailles de ` +
      'texte exactes, mesures et fonds vérifiés, ruban et pulsations actifs.',
  )
}

if (lanceDirectement(import.meta.url)) await executer()
