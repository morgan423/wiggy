/**
 * Le catalogue de la page publique (planche 20a).
 *
 * ⚠️ **20a REMPLACE 15a.** L'ordre de la page change : les CONDITIONS passent
 * avant le CATALOGUE. Le constat de Morgan avant recette : avec cinq ou six
 * prestations, le bloc « Réserver avec {prénom} » et ses mentions tombaient
 * sous la ligne de flottaison — or c'est ce bloc qui décide si une cliente
 * réserve. Le catalogue, lui, se replie.
 *
 * Ce module ne décide QUE de la forme du catalogue. Il ne lit pas la base, ne
 * connaît ni React ni Next, et rend une structure que l'écran se contente de
 * peindre. C'est ce qui permet de tester les seuils sans navigateur — et les
 * seuils sont exactement ce qui se déforme quand on les laisse dans une page.
 *
 * ⚠️ **AUCUNE DONNÉE NOUVELLE.** Les groupes existent (B13), les réalisations
 * aussi. C'est un réordonnancement plus un repli, pas un modèle.
 */

/** Ce que le catalogue a besoin de savoir d'une prestation, et rien de plus. */
export type PrestationCatalogue = {
  readonly id: string
  readonly name: string
  readonly price_cents: number
  readonly category: string | null
}

/**
 * Le libellé d'une rangée qui recueille ce qui n'est rangé nulle part.
 *
 * Il n'apparaît QUE chez une pro qui a des groupes : sans groupe du tout, une
 * rangée « Autres » suggérerait qu'il manque un rangement, alors que ne rien
 * ranger est un choix que B13 autorise explicitement.
 */
export const GROUPE_AUTRES = 'Autres'

/**
 * Combien de prestations restent à plat avant que le reste se replie.
 *
 * Trois, et pas quatre : c'est le nombre qui tient dans un pouce sans faire
 * défiler, et il laisse voir des PRIX RÉELS — ce qu'une page entièrement
 * repliée ne fait pas.
 */
export const A_PLAT = 3

export type Groupe = {
  readonly nom: string
  readonly prestations: readonly PrestationCatalogue[]
  /** Le plus bas prix du groupe, en centimes. Situe avant de déplier. */
  readonly desCentimes: number
}

export type Catalogue =
  /** La pro a rangé : des rangées de groupes, la première dépliée. */
  | { readonly forme: 'groupes'; readonly groupes: readonly Groupe[] }
  /** Une à trois prestations : tout à plat, aucun repli. */
  | { readonly forme: 'plate'; readonly prestations: readonly PrestationCatalogue[] }
  /** Quatre et plus sans groupe : trois à plat, le reste replié. */
  | {
      readonly forme: 'repliee'
      readonly visibles: readonly PrestationCatalogue[]
      readonly repliees: readonly PrestationCatalogue[]
    }
  /** Aucune prestation : la section disparaît, elle ne s'affiche pas vide. */
  | { readonly forme: 'vide' }

const moinsCher = (liste: readonly PrestationCatalogue[]) =>
  liste.reduce((mini, p) => (p.price_cents < mini ? p.price_cents : mini), Infinity)

/**
 * Quelle forme donner au catalogue.
 *
 * ⚠️ **L'ORDRE DE LA PRO FAIT FOI, ET C'EST LA DÉCISION CENTRALE.** On ne trie
 * pas par prix, ni par nom, ni par popularité : ce que la pro met en premier
 * dans son hub est ce que la cliente voit en premier. On ne lui demande rien,
 * et rien ne se réordonne dans son dos. C'est ce qui rend le repli acceptable —
 * la page cache le bas de SA liste, pas le bas d'un classement qu'elle n'a pas
 * choisi.
 *
 * Les trois seuils viennent de la planche, et ils se lisent d'une traite :
 *
 * · 1 à 3 sans groupe → tout à plat, aucun repli. Replier trois lignes
 *   coûterait un tap pour cacher trois lignes ;
 * · 4 et plus sans groupe → 3 à plat, le reste sous « Ses N autres
 *   prestations ». La page reste courte à neuf prestations comme à vingt ;
 * · avec groupes → des rangées de groupes, la PREMIÈRE DÉPLIÉE. La page montre
 *   des prix réels sans un seul tap, ce qu'une pile de rangées fermées ne fait
 *   pas — elle donnerait un catalogue à ouvrir plutôt qu'un tarif à lire.
 */
export function presenterCatalogue(prestations: readonly PrestationCatalogue[]): Catalogue {
  if (prestations.length === 0) return { forme: 'vide' }

  /*
    Les groupes gardent l'ordre de PREMIÈRE APPARITION dans la liste de la pro.
    Trier par nom aurait mis « Coiffage » avant « Coupe » chez toutes les pros,
    quel que soit leur métier — un ordre alphabétique n'est l'ordre de personne.
  */
  const parGroupe = new Map<string, PrestationCatalogue[]>()
  const orphelines: PrestationCatalogue[] = []
  for (const p of prestations) {
    if (p.category === null || p.category === '') {
      orphelines.push(p)
      continue
    }
    parGroupe.set(p.category, [...(parGroupe.get(p.category) ?? []), p])
  }

  if (parGroupe.size === 0) {
    return prestations.length <= A_PLAT
      ? { forme: 'plate', prestations }
      : {
          forme: 'repliee',
          visibles: prestations.slice(0, A_PLAT),
          repliees: prestations.slice(A_PLAT),
        }
  }

  const groupes: Groupe[] = [...parGroupe].map(([nom, liste]) => ({
    nom,
    prestations: liste,
    desCentimes: moinsCher(liste),
  }))
  // Ce qui n'est rangé nulle part ferme la liste : ça ne s'efface pas, et ça ne
  // passe pas devant ce que la pro a pris la peine de ranger.
  if (orphelines.length > 0) {
    groupes.push({
      nom: GROUPE_AUTRES,
      prestations: orphelines,
      desCentimes: moinsCher(orphelines),
    })
  }
  return { forme: 'groupes', groupes }
}

/**
 * Le prix d'entrée de la page, en centimes.
 *
 * ⚠️ **IL PORTE UN POIDS NOUVEAU.** Avec 20a, le « dès X € » du bloc conditions
 * devient la SEULE indication de prix visible à l'ouverture : tout le reste est
 * replié. Il se calcule comme avant, sur la prestation la moins chère, mais une
 * erreur ici ne se rattrape plus par le catalogue en dessous.
 */
export function prixDEntree(prestations: readonly PrestationCatalogue[]): number | undefined {
  if (prestations.length === 0) return undefined
  return moinsCher(prestations)
}
