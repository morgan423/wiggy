/**
 * Avatar — les règles, pas le rendu.
 *
 * Trois sources, dans cet ordre : la photo réelle du pro, puis l'illustration
 * du système à 8 personnages, puis l'initiale sur pastille. Le board est
 * explicite : « la photo réelle du pro reste prioritaire ; l'avatar est
 * l'alternative désirable. »
 *
 * Les illustrations sont ARRIVÉES le 04/09. Ce module les décrivait déjà en
 * creux ; leur arrivée n'a demandé qu'un remplissage, pas une refonte.
 */

/** Teintes admises pour une pastille. Le texte associé est imposé, jamais choisi. */
export const PASTILLES = ['action', 'celebration', 'attente', 'prune'] as const
export type Pastille = (typeof PASTILLES)[number]

/**
 * Couleur de texte obligatoire sur chaque pastille.
 * Du blanc sur miel ou abricot tombe sous le seuil de contraste : le pro
 * travaille dehors, en plein soleil.
 */
export const TEXTE_SUR_PASTILLE: Record<Pastille, 'surPlein' | 'surMiel'> = {
  action: 'surPlein',
  prune: 'surPlein',
  celebration: 'surMiel',
  attente: 'surMiel',
}

/** Initiale affichée. Une seule lettre, accents conservés. */
export function initiale(nom: string): string {
  const premier =
    nom
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(' ')[0] ?? ''
  return premier ? premier[0].toLocaleUpperCase('fr-FR') : '?'
}

/**
 * Pastille déterministe : le même nom donne toujours la même couleur, d'un
 * écran à l'autre et d'une session à l'autre. Une couleur tirée au hasard
 * ferait « clignoter » la fiche d'une cliente à chaque rendu.
 */
export function pastillePour(graine: string): Pastille {
  let somme = 0
  for (const c of graine.trim().toLocaleLowerCase('fr-FR')) {
    somme = (somme * 31 + (c.codePointAt(0) ?? 0)) >>> 0
  }
  return PASTILLES[somme % PASTILLES.length]
}

/**
 * Décale la pastille pour éviter deux fois la même couleur côte à côte
 * (règle du système d'avatars). `rang` est la position dans la liste.
 */
export function pastilleDansListe(graine: string, rang: number, precedente?: Pastille): Pastille {
  const choix = pastillePour(graine)
  if (precedente !== choix) return choix
  return PASTILLES[(PASTILLES.indexOf(choix) + 1 + rang) % PASTILLES.length]
}

export type SourceAvatar = 'photo' | 'illustration' | 'initiale'

/** Quelle source utiliser, dans l'ordre de priorité. */
export function sourceAvatar(options: {
  photoUrl?: string | null
  illustration?: string | null
}): SourceAvatar {
  if (options.photoUrl) return 'photo'
  if (options.illustration) return 'illustration'
  return 'initiale'
}

/* ── Le système à huit illustrations (planche 3b, livré le 04/09) ────────── */

/**
 * ⚠️ LA PASTILLE DE L'ILLUSTRATION N'EST PAS LA PASTILLE DE L'INITIALE.
 *
 * Elles portent le même mot et ne désignent pas la même chose. Celle de
 * `PASTILLES` est une couleur QU'ON CHOISIT au rendu pour poser une lettre
 * dessus. Celle-ci est une couleur DÉJÀ PEINTE DANS LE FICHIER : le disque fait
 * partie de l'illustration, on ne peut ni la changer ni la retirer. C'est aussi
 * pourquoi elle compte une teinte de plus, la crème, qui n'a jamais servi de
 * fond à une initiale.
 *
 * Les confondre reviendrait à croire qu'on peut recolorer un avatar. On ne peut
 * pas : la variante sans pastille, sur fond transparent, N'EXISTE PAS ENCORE.
 */
export const PASTILLES_ILLUSTREES = ['miel', 'abricot', 'framboise', 'prune', 'creme'] as const
export type PastilleIllustree = (typeof PASTILLES_ILLUSTREES)[number]

export type Illustration = {
  readonly id: string
  readonly rang: number
  readonly prenom: string
  readonly pastille: PastilleIllustree
}

/**
 * Les huit personnages, dans l'ordre du manifeste
 * (`apps/web/public/avatars/avatars.json`).
 *
 * ⚠️ CETTE LISTE EST UNE COPIE, et `npm run design:check` refuse qu'elle dérive
 * du manifeste ou des fichiers réellement présents. La copie existe parce que
 * `@wiggy/core` est portable : il ne lit pas le disque et ne connaît pas
 * l'arborescence d'une application. Le contrôle rend la copie sûre — sans lui,
 * elle serait exactement le genre de duplication qui pourrit en silence.
 *
 * L'ordre n'est pas décoratif : il respecte déjà la règle de composition
 * ci-dessous, et le manifeste demande de ne pas le réordonner sans raison.
 */
export const ILLUSTRATIONS: readonly Illustration[] = [
  { id: 'awa', rang: 1, prenom: 'Awa', pastille: 'miel' },
  { id: 'marc', rang: 2, prenom: 'Marc', pastille: 'abricot' },
  { id: 'jeanne', rang: 3, prenom: 'Jeanne', pastille: 'framboise' },
  { id: 'lou', rang: 4, prenom: 'Lou', pastille: 'prune' },
  { id: 'karim', rang: 5, prenom: 'Karim', pastille: 'creme' },
  { id: 'elsa', rang: 6, prenom: 'Elsa', pastille: 'miel' },
  { id: 'theo', rang: 7, prenom: 'Théo', pastille: 'abricot' },
  { id: 'nadia', rang: 8, prenom: 'Nadia', pastille: 'prune' },
]

/**
 * Les deux seules tailles livrées.
 *
 * ⚠️ ON N'EN INVENTE PAS UNE TROISIÈME. Les masters en 1254 px vivent hors du
 * dépôt : demander `/avatars/awa-96.webp` ne donne pas une image plus petite,
 * ça donne un 404 et un trou dans la page. 160 pour l'affichage courant, 320
 * pour le double densité, et c'est tout.
 */
export const TAILLES_ILLUSTRATION = [160, 320] as const
export type TailleIllustration = (typeof TAILLES_ILLUSTRATION)[number]

export function estUneIllustration(id: string): boolean {
  return ILLUSTRATIONS.some((i) => i.id === id)
}

/**
 * L'adresse d'une illustration.
 *
 * Elle LÈVE sur un identifiant ou une taille inconnus, au lieu de rendre une
 * URL qui donnera un 404. Un avatar manquant ne casse rien de visible côté
 * serveur : il laisse juste un trou dans la page, que personne ne voit avant
 * la production. Autant échouer à la construction.
 */
export function urlIllustration(id: string, taille: TailleIllustration = 160): string {
  if (!estUneIllustration(id)) {
    throw new Error(`Avatar inconnu : « ${id} ». Les huit sont dans ILLUSTRATIONS.`)
  }
  if (!TAILLES_ILLUSTRATION.includes(taille)) {
    throw new Error(`Taille d'avatar non livrée : ${String(taille)}. Seules 160 et 320 existent.`)
  }
  return `/avatars/${id}-${String(taille)}.webp`
}

/**
 * La règle de composition du manifeste : jamais deux pastilles de la même
 * couleur côte à côte quand les avatars sont affichés en rangée.
 *
 * Rendue vérifiable plutôt que répétée. Elle ne réordonne rien toute seule :
 * elle DIT si une suite la respecte, et c'est un test qui s'en sert. Réordonner
 * en silence masquerait une composition fautive au lieu de la signaler.
 */
export function rangeeValide(ids: readonly string[]): boolean {
  const pastilles = ids.map((id) => ILLUSTRATIONS.find((i) => i.id === id)?.pastille)
  return pastilles.every((p, i) => i === 0 || p !== pastilles[i - 1])
}
