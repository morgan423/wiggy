// Le serveur de développement, vu par les scripts qui pilotent un navigateur.
//
// Partagé par le test de bout en bout (D8) et par `npm run vues` : deux
// implémentations de la même chose finiraient par diverger, et l'une des deux
// tomberait sans qu'on sache pourquoi.
//
// LE PIÈGE, PAYÉ UNE FOIS. Next refuse un second serveur de développement de
// façon GLOBALE, pas par port. Traiter « le port 3000 ne répond pas » comme
// « aucun serveur ne tourne » conduisait à en lancer un second, que Next
// refusait aussitôt, et à attendre soixante secondes pour rien. Le test de bout
// en bout échouait alors sans rapport avec le code livré, et un garde-fou
// instable finit toujours par être ignoré.
import { spawn } from 'node:child_process'
import { setTimeout as attendre } from 'node:timers/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Les ports où un serveur de développement peut déjà répondre. */
const PORTS_CONNUS = [3000, 3010, 3011]

const repond = async (base) => {
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(2000) })
    return r.ok
  } catch {
    return false
  }
}

/** Le premier port qui répond, ou null. */
async function serveurExistant(ports = PORTS_CONNUS) {
  for (const port of ports) {
    if (await repond(`http://localhost:${port}`)) return `http://localhost:${port}`
  }
  return null
}

/**
 * Réutilise le serveur de développement s'il tourne, en démarre un sinon.
 *
 * On laisse d'abord quelques secondes à un serveur en cours de démarrage :
 * c'est le cas courant quand deux scripts s'enchaînent dans `npm run verify`,
 * et le confondre avec une absence coûtait le piège décrit plus haut.
 */
export async function preparerServeur(port = 3010) {
  const rienAArreter = () => undefined
  const impose = process.env.E2E_BASE_URL
  if (impose) return { base: impose, arreter: rienAArreter }

  for (let i = 0; i < 5; i++) {
    const base = await serveurExistant()
    if (base) {
      console.log(`Serveur de développement déjà en marche (${base}), réutilisé.`)
      return { base, arreter: rienAArreter }
    }
    if (i < 4) await attendre(2000)
  }

  console.log('Démarrage d’un serveur de développement…')
  const serveur = spawn('npx', ['next', 'dev', '--port', String(port)], {
    cwd: join(racine, 'apps/web'),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // Next annonce son refus sur la sortie : on le lit plutôt que d'attendre
  // l'expiration, et on se rabat sur le serveur qui tourne déjà.
  let refus = false
  const lire = (flux) => {
    flux.setEncoding('utf8')
    flux.on('data', (texte) => {
      if (texte.includes('Another next dev server')) refus = true
    })
  }
  lire(serveur.stdout)
  lire(serveur.stderr)

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
    if (refus || serveur.exitCode !== null) {
      serveur.kill()
      const base = await serveurExistant()
      if (base) {
        console.log(`Next refuse un second serveur : celui de ${base} est réutilisé.`)
        return { base, arreter: rienAArreter }
      }
      throw new Error(
        'Next refuse de démarrer un second serveur de développement, et aucun autre ne répond. ' +
          'Arrêter le serveur existant, ou poser E2E_BASE_URL.',
      )
    }
  }
  serveur.kill()
  throw new Error('Le serveur de développement n’a pas démarré en 60 secondes.')
}
