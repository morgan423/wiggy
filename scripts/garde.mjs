// Gardes communes aux scripts qui écrivent (règle R2-4 de CLAUDE.md).
//
// Une vérification ne modifie jamais rien. Ces trois fonctions rendent la
// règle exécutable, au lieu de la laisser à la vigilance de qui code.
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Vrai seulement si CE fichier est le point d'entrée de node.
 *
 * Importer un script ne doit rien déclencher : c'est ce réflexe, « je vérifie
 * juste qu'il se charge », qui a écrit trente-cinq mille lignes en base.
 */
export function lanceDirectement(importMetaUrl) {
  const entree = process.argv[1]
  return Boolean(entree) && importMetaUrl === pathToFileURL(entree).href
}

/** Vrai tant que `--appliquer` n'est pas passé. Le défaut ne fait rien. */
export function modeEssai(argv = process.argv) {
  return !argv.includes('--appliquer')
}

/** Lit .env.local sans dépendance : les clés ne quittent pas la machine. */
export function env() {
  const valeurs = {}
  for (const ligne of readFileSync(join(racine, 'apps/web/.env.local'), 'utf8').split('\n')) {
    const i = ligne.indexOf('=')
    if (i < 1 || ligne.trim().startsWith('#')) continue
    valeurs[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
  }
  return valeurs
}

/**
 * Refuse de continuer si l'environnement visé n'est pas le développement.
 *
 * D7 sépare deux projets Supabase : la production porte les fiches de vraies
 * clientes et ne sert jamais à une recette. Tant que `WIGGY_ENV` n'affirme pas
 * « developpement », un script destructeur s'arrête.
 */
export function exigerDeveloppement(valeurs) {
  const cible = valeurs.WIGGY_ENV ?? process.env.WIGGY_ENV
  if (cible === 'developpement') return
  console.error(
    'Refus : ce script supprime des données et ne tourne qu’en développement.\n' +
      'Pose WIGGY_ENV=developpement dans apps/web/.env.local pour le projet de développement (D7).',
  )
  process.exit(1)
}
