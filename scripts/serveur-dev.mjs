// Le serveur de développement, vu par les scripts qui pilotent un navigateur.
//
// Partagé par le test de bout en bout (D8) et par `npm run vues` : deux
// implémentations de la même chose finiraient par diverger, et l'une des deux
// tomberait sans qu'on sache pourquoi.
import { spawn } from 'node:child_process'
import { setTimeout as attendre } from 'node:timers/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

const repond = async (base) => {
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(2000) })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Réutilise le serveur de développement s'il tourne, en démarre un sinon.
 *
 * Next refuse un second serveur de développement : réutiliser celui qui tourne
 * n'est pas un raccourci, c'est le seul chemin qui marche dans les deux cas.
 */
export async function preparerServeur(port = 3010) {
  const rienAArreter = () => undefined
  const impose = process.env.E2E_BASE_URL
  if (impose) return { base: impose, arreter: rienAArreter }
  if (await repond('http://localhost:3000')) {
    console.log('Serveur de développement déjà en marche, réutilisé.')
    return { base: 'http://localhost:3000', arreter: rienAArreter }
  }

  console.log('Démarrage d’un serveur de développement…')
  const serveur = spawn('npx', ['next', 'dev', '--port', String(port)], {
    cwd: join(racine, 'apps/web'),
    stdio: 'ignore',
  })
  for (let i = 0; i < 60; i++) {
    await attendre(1000)
    if (await repond(`http://localhost:${port}`)) {
      return {
        base: `http://localhost:${port}`,
        arreter: () => {
          serveur.kill()
        },
      }
    }
  }
  serveur.kill()
  throw new Error('Le serveur de développement n’a pas démarré en 60 secondes.')
}
