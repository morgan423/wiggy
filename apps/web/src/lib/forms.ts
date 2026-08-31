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
   * Ce que le pro venait de saisir, renvoyé tel quel en cas d'erreur.
   *
   * React 19 réinitialise un formulaire non contrôlé dès qu'une action se
   * termine : sans ce renvoi, une simple faute de frappe effaçait tout un
   * rendez-vous et il fallait tout ressaisir.
   */
  saisie?: Record<string, string>
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

export function erreur(precedent: EtatForm, message: string, donnees?: FormData): EtatForm {
  return {
    statut: 'erreur',
    message,
    n: precedent.n + 1,
    saisie: donnees ? saisieDe(donnees) : undefined,
  }
}

export function ok(precedent: EtatForm, message?: string): EtatForm {
  return { statut: 'ok', message, n: precedent.n + 1 }
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
