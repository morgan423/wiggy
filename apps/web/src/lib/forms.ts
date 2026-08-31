/**
 * État commun à tous les formulaires de l'espace pro.
 *
 * `n` s'incrémente à chaque réponse du serveur. Il sert de clé de remontage
 * côté React : sans lui, deux succès identiques d'affilée produiraient le même
 * état et le formulaire ne se réinitialiserait pas. C'est déterministe, là où
 * un `Math.random()` au rendu casserait l'hydratation.
 */
export type EtatForm = {
  statut: 'vide' | 'ok' | 'erreur'
  message?: string
  n: number
  /**
   * En erreur : ce que la personne venait de saisir, renvoyé tel quel.
   * En succès : ce que la base a réellement enregistré, relu après écriture.
   *
   * React 19 réinitialise un formulaire non contrôlé dès qu'une action se
   * termine : sans ce renvoi, une simple faute de frappe effaçait tout un
   * rendez-vous et il fallait tout ressaisir.
   */
  saisie?: Record<string, string>
  /** Champ fautif, pour y poser le curseur plutôt que de le faire chercher. */
  champ?: string
}

export const VIDE: EtatForm = { statut: 'vide', n: 0 }

/** Champs qu'on ne renvoie jamais à l'écran, même pour repeupler un formulaire. */
const JAMAIS_RENVOYE = new Set(['motDePasse', 'password'])

function saisieDe(donnees: FormData): Record<string, string> {
  const saisie: Record<string, string> = {}
  for (const [cle, valeur] of donnees.entries()) {
    if (typeof valeur === 'string' && !JAMAIS_RENVOYE.has(cle)) saisie[cle] = valeur
  }
  return saisie
}

export function erreur(
  precedent: EtatForm,
  message: string,
  donnees?: FormData,
  champ?: string,
): EtatForm {
  return {
    statut: 'erreur',
    message,
    n: precedent.n + 1,
    saisie: donnees ? saisieDe(donnees) : undefined,
    champ,
  }
}

/**
 * Succès, avec ce qui a réellement été enregistré.
 *
 * Le troisième argument n'est pas un confort : sans lui, un formulaire non
 * contrôlé se réaffiche à partir des valeurs du rendu précédent, et un champ
 * dont l'écriture n'a rien fait « retombe » sous les yeux du pro sans que rien
 * ne le signale (recette du 31/08, bloquant B4). Ce qui s'affiche après un
 * enregistrement doit venir de la base, pas de la mémoire de l'écran.
 */
export function ok(
  precedent: EtatForm,
  message?: string,
  enregistre?: Record<string, string | number | boolean | null>,
): EtatForm {
  return {
    statut: 'ok',
    message,
    n: precedent.n + 1,
    saisie: enregistre
      ? Object.fromEntries(
          Object.entries(enregistre).map(([cle, valeur]) => [
            cle,
            valeur === null ? '' : String(valeur),
          ]),
        )
      : undefined,
  }
}

/**
 * Traduit une erreur Supabase en message lisible, sans jamais recopier le
 * détail technique côté écran ni écrire de donnée personnelle dans les logs
 * (principe non négociable n°3).
 */
export function erreurBase(
  precedent: EtatForm,
  contexte: string,
  e: { code?: string } | null,
  donnees?: FormData,
): EtatForm {
  console.error(contexte, e?.code ?? 'inconnu')
  return erreur(precedent, 'L’enregistrement a échoué. Réessaie dans un instant.', donnees)
}

/**
 * Lit un champ de formulaire comme texte.
 *
 * `FormData.get` renvoie `string | File | null`. Ce helper existe pour deux
 * raisons : un `File` ne doit jamais finir converti en « [object File] », et
 * un champ vide doit valoir `null` et non `''` — un formulaire HTML n'envoie
 * jamais `null`, il envoie la chaîne vide.
 */
export function champ(donnees: FormData, nom: string): string | null {
  const valeur = donnees.get(nom)
  if (typeof valeur !== 'string') return null
  const propre = valeur.trim()
  return propre === '' ? null : propre
}

/** Même lecture, mais en repliant l'absence sur la chaîne vide. */
export function champTexte(donnees: FormData, nom: string): string {
  return champ(donnees, nom) ?? ''
}
