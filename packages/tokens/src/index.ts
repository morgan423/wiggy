import tokens from '../wiggy-tokens.json' with { type: 'json' }

/**
 * Thème unique de Wiggy, consommable par les trois surfaces.
 *
 * Le web charge `@wiggy/tokens/css` (variables CSS) ; l'app Expo, qui n'a pas
 * de CSS, lit ces valeurs en TypeScript. Une seule source, deux sorties.
 */
export const wiggy = tokens

export const couleurs = Object.fromEntries(
  Object.entries(tokens.couleur).map(([cle, v]) => [cle, v.valeur]),
) as Record<keyof typeof tokens.couleur, string>

export const radius = tokens.radius
export const espacement = tokens.espacement
export const motion = tokens.motion
export const regles = tokens.regles

/** Toutes les couleurs autorisées, en minuscules — sert aux contrôles. */
export const PALETTE = new Set(
  [
    ...Object.values(tokens.couleur),
    ...Object.values(tokens.texte),
    ...Object.values(tokens.trait),
  ].map((c) => c.valeur.toLowerCase()),
)
