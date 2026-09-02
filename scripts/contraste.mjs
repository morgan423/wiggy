// Contrôle de contraste : le texte illisible fait échouer la livraison.
//
// Trois défauts de la semaine n'existaient qu'à l'écran, dont du blanc cassé
// sur du crème que `verify` a laissé passer au vert. Le typage voit des
// classes, le lint voit du code, les tests voient des fonctions : aucun ne
// voit une couleur posée sur une autre.
//
// La mesure suit WCAG 2.1 : luminance relative des deux couleurs, rapport
// (L1 + 0,05) / (L2 + 0,05). Le fond effectif est celui du premier ancêtre qui
// en a un d'opaque, comme le fait l'œil.
//
// DEUX SEUILS, et la distinction compte.
//
//   BLOQUANT : ce qui est illisible. 3,0 pour le texte courant, 2,0 pour le
//   grand texte. En dessous, ce n'est pas un parti pris, c'est une panne.
//
//   AVERTISSEMENT : le niveau AA (4,5 et 3,0). Signalé, non bloquant. Certains
//   jetons ratifiés s'y logent volontairement, `texte-attenue` sur crème par
//   exemple, et faire échouer dessus rendrait le contrôle ignoré au bout de
//   trois fois. Relever la barre au niveau AA est une décision de design, pas
//   une décision de qui code.

export const SEUILS = {
  bloquantCourant: 3.0,
  bloquantGrand: 2.0,
  aaCourant: 4.5,
  aaGrand: 3.0,
}

/**
 * Relevé de tous les textes visibles d'une page, avec leur contraste.
 *
 * Exécuté DANS la page : seul le navigateur connaît les couleurs réellement
 * appliquées, après cascade, variables CSS et transparences.
 */
export async function releverContrastes(page) {
  return page.evaluate(() => {
    const enRvb = (couleur) => {
      const m = /rgba?\(([^)]+)\)/.exec(couleur)
      if (!m) return null
      const [r, v, b, a = '1'] = m[1].split(',').map((x) => Number.parseFloat(x))
      return { r, v, b, a }
    }

    const superposer = (dessus, dessous) => ({
      r: dessus.r * dessus.a + dessous.r * (1 - dessus.a),
      v: dessus.v * dessus.a + dessous.v * (1 - dessus.a),
      b: dessus.b * dessus.a + dessous.b * (1 - dessus.a),
      a: 1,
    })

    const luminance = ({ r, v, b }) => {
      const canal = (c) => {
        const n = c / 255
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b)
    }

    /** Le fond réellement vu : on remonte jusqu'à trouver de l'opaque. */
    const fondEffectif = (element) => {
      let couche = { r: 255, v: 255, b: 255, a: 1 }
      const piles = []
      for (let n = element; n; n = n.parentElement) {
        const fond = enRvb(getComputedStyle(n).backgroundColor)
        if (fond && fond.a > 0) {
          piles.unshift(fond)
          if (fond.a === 1) break
        }
      }
      for (const p of piles) couche = superposer(p, couche)
      return couche
    }

    const visible = (element) => {
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none') return false
      if (Number.parseFloat(style.opacity) < 0.1) return false
      const boite = element.getBoundingClientRect()
      return boite.width > 0 && boite.height > 0
    }

    const releves = []
    const vus = new Set()

    for (const element of document.querySelectorAll('body *')) {
      // Seuls les éléments qui portent eux-mêmes du texte : sinon on mesure
      // vingt fois le même mot à travers ses ancêtres.
      const texte = [...element.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim()
      if (!texte || texte.length < 2) continue
      if (!visible(element)) continue

      const style = getComputedStyle(element)
      const avant = enRvb(style.color)
      if (!avant || avant.a === 0) continue

      const fond = fondEffectif(element)
      const premierPlan = avant.a < 1 ? superposer(avant, fond) : avant

      const l1 = luminance(premierPlan)
      const l2 = luminance(fond)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

      const taille = Number.parseFloat(style.fontSize)
      const gras = Number.parseInt(style.fontWeight, 10) >= 700
      // Définition WCAG du « grand texte » : 24 px, ou 18,66 px en gras.
      const grand = taille >= 24 || (gras && taille >= 18.66)

      const cle = `${texte.slice(0, 40)}|${style.color}|${taille}`
      if (vus.has(cle)) continue
      vus.add(cle)

      releves.push({
        texte: texte.slice(0, 60),
        balise: element.tagName.toLowerCase(),
        classes: (element.className?.baseVal ?? element.className ?? '').toString().slice(0, 60),
        couleur: style.color,
        fond: `rgb(${Math.round(fond.r)}, ${Math.round(fond.v)}, ${Math.round(fond.b)})`,
        taille,
        grand,
        ratio: Math.round(ratio * 100) / 100,
      })
    }
    return releves
  })
}

/** Trie un relevé en illisibles (bloquants) et en écarts au niveau AA. */
export function juger(releves) {
  const illisibles = []
  const souslAA = []
  for (const r of releves) {
    const bloquant = r.grand ? SEUILS.bloquantGrand : SEUILS.bloquantCourant
    const aa = r.grand ? SEUILS.aaGrand : SEUILS.aaCourant
    if (r.ratio < bloquant) illisibles.push(r)
    else if (r.ratio < aa) souslAA.push(r)
  }
  return { illisibles, souslAA }
}
