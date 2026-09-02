/**
 * Argent — toujours en centimes entiers, jamais en flottant.
 *
 * Le pro saisit « 42,50 » ; la base stocke 4250 ; la cliente lit « 42,50 € ».
 * Ces trois conversions sont écrites ici une seule fois : une prestation mal
 * arrondie, c'est un acompte Stripe faux et une facture fausse derrière.
 */

export const CENTS_PAR_EURO = 100

/**
 * Lit un montant saisi au clavier, en tolérant les usages français :
 * virgule décimale, espaces (y compris insécables), symbole €.
 * Renvoie null si la saisie n'est pas un montant — jamais NaN, jamais 0.
 */
export function parseEuros(saisie: string): number | null {
  const nettoye = saisie
    // U+00A0 insécable et U+202F fine insécable : les deux arrivent dans les
    // montants copiés depuis une page web ou un tableur, et sont invisibles à
    // la relecture. Écrites en échappement pour rester lisibles.
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/€/g, '')
    .replace(',', '.')
  if (nettoye === '' || !/^\d+(\.\d{1,2})?$/.test(nettoye)) return null
  // Passe par une chaîne pour éviter 42.35 * 100 = 4234.999...
  const [entiers, decimales = ''] = nettoye.split('.')
  return Number(entiers) * CENTS_PAR_EURO + Number(decimales.padEnd(2, '0'))
}

/** Formate pour l'affichage : 4250 → « 42,50 € ». */
export function formatEuros(cents: number): string {
  // Un compte rond s'écrit rond : « 45 € », pas « 45,00 € ». Toutes les
  // planches de Design écrivent les prix ainsi, et c'est aussi ce qu'écrit une
  // coiffeuse sur sa carte. Les centimes ne s'affichent que s'il y en a.
  const rond = cents % CENTS_PAR_EURO === 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: rond ? 0 : 2,
  }).format(cents / CENTS_PAR_EURO)
}

/**
 * Montant de l'acompte, arrondi à l'euro supérieur.
 *
 * L'arrondi va vers le haut volontairement : mieux vaut un acompte d'un
 * centime de plus qu'un reste à payer qui ne tombe pas juste.
 */
export function montantAcompte(prixCents: number, pourcentage: number): number {
  const brut = (prixCents * pourcentage) / 100
  return Math.min(prixCents, Math.ceil(brut))
}

/** Reste à régler sur place, une fois l'acompte encaissé. */
export function resteAPayer(prixCents: number, pourcentage: number): number {
  return prixCents - montantAcompte(prixCents, pourcentage)
}
