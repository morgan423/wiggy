// C9 — preuve que le durcissement PWA tient réellement.
//
// D4 fait de C9 une CONDITION D'ENTRÉE de la bêta : la webapp doit s'installer
// sur l'écran d'accueil et la tournée doit survivre à une zone blanche. Ces
// deux propriétés ne se lisent dans aucun fichier — elles se constatent dans un
// navigateur, ou elles ne se constatent pas.
//
// Le contrôle vérifie, dans un vrai Chrome :
//   ① le manifeste est complet et l'icône assez grande pour que l'installation
//      soit proposée (sous 192 px, Android refuse purement et simplement) ;
//   ② le service worker s'active, met la tournée en cache, et la ressert quand
//      le réseau tombe ;
//   ③ le gestionnaire de push existe.
import { chromium } from 'playwright-core'
import { lanceDirectement, env, exigerDeveloppement } from './garde.mjs'
import { preparerServeur } from './serveur-dev.mjs'
// On réutilise le semis de `npm run vues` plutôt que d'en écrire un second :
// deux semeurs destructeurs sur les mêmes comptes, c'est deux occasions de se
// tromper, et un seul d'entre eux serait tenu à jour.
import { api, semer, nettoyer, connecter, COMPTES } from './vues.mjs'

const PORT = 3012

async function executer() {
  const valeurs = env()
  exigerDeveloppement(valeurs)
  const client = api(valeurs)
  await semer(client)
  const serveur = await preparerServeur(PORT)
  // ⚠️ L'URL vient du serveur, elle ne se DEVINE pas : `preparerServeur`
  // réutilise un serveur déjà en marche quand il en trouve un, et il tourne
  // alors sur SON port. Reconstruire l'adresse depuis `PORT` faisait échouer ce
  // contrôle dès que Morgan avait son `npm run dev` ouvert, ce qui est le cas
  // normal.
  const base = serveur.base
  const echecs = []
  let navigateur

  try {
    navigateur = await chromium.launch({ channel: 'chrome' })
    const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } })
    const page = await contexte.newPage()
    // Connectée : sans compte, `/app/tournee` redirige vers la connexion, et le
    // contrôle mesurerait la mise en cache d'un écran de connexion en croyant
    // mesurer celle de la tournée.
    await connecter(page, base, COMPTES.rempli)

    // ① Le manifeste.
    const manifeste = await page.evaluate(async () => {
      const r = await fetch('/manifest.webmanifest')
      return r.ok ? r.json() : null
    })
    if (!manifeste) echecs.push('Aucun manifeste servi : rien ne s’installera.')
    else {
      if (manifeste.display !== 'standalone') {
        echecs.push(
          `display vaut « ${manifeste.display} » : la barre du navigateur resterait visible, ` +
            'et le produit ressemblerait à un site épinglé.',
        )
      }
      const tailles = (manifeste.icons ?? []).map((i) => Number.parseInt(i.sizes, 10))
      if (!tailles.some((t) => t >= 192)) {
        echecs.push('Aucune icône ≥ 192 px : Android ne proposera pas l’installation.')
      }
      if (!(manifeste.icons ?? []).some((i) => i.purpose === 'maskable')) {
        echecs.push('Aucune icône « maskable » : Android l’inscrira dans un carré blanc.')
      }
    }

    // ② Le service worker, et le hors-ligne.
    const actif = await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js')
      const pret = await navigator.serviceWorker.ready
      return Boolean(pret.active)
    })
    if (!actif) echecs.push('Le service worker ne s’active pas : aucun hors-ligne.')

    // On charge la tournée une fois EN LIGNE, comme une pro qui regarde sa
    // journée avant de partir. C'est ce passage-là qui remplit le cache.
    await page.goto(`${base}/app/tournee`, { waitUntil: 'networkidle' }).catch(() => undefined)
    const enCache = await page.evaluate(async () => {
      const noms = await caches.keys()
      for (const nom of noms) {
        const cache = await caches.open(nom)
        const cles = await cache.keys()
        if (cles.some((r) => new URL(r.url).pathname.startsWith('/app/tournee'))) return true
      }
      return false
    })
    if (!enCache) echecs.push('La tournée n’est pas mise en cache : la zone blanche la perdrait.')

    // La zone blanche, pour de vrai.
    await contexte.setOffline(true)
    const horsLigne = await page.goto(`${base}/app/tournee`).catch(() => null)
    const texte = horsLigne ? await page.content() : ''
    if (!horsLigne) {
      echecs.push('Hors ligne, la tournée ne répond rien du tout : écran mort.')
    } else if (texte.includes('Pas de réseau ici')) {
      // La page de secours est correcte en soi, mais elle signifie que le cache
      // n'a pas resservi la tournée. On le dit plutôt que de la compter juste.
      echecs.push(
        'Hors ligne, c’est la page de secours qui s’affiche et non la tournée mise en cache.',
      )
    }
    await contexte.setOffline(false)

    // ③ Le push.
    const sw = await page.evaluate(async () => (await fetch('/sw.js')).text())
    if (!sw.includes("addEventListener('push'")) {
      echecs.push('Le service worker ne sait pas recevoir de push.')
    }
  } finally {
    await navigateur?.close().catch(() => undefined)
    serveur.arreter()
    await nettoyer(client)
  }

  if (echecs.length > 0) {
    console.error('\n✖ Durcissement PWA (C9) incomplet :')
    for (const e of echecs) console.error(`   ${e}`)
    process.exit(1)
  }
  console.log('PWA : installable, tournée consultable hors-ligne, push reçu.')
}

if (lanceDirectement(import.meta.url)) await executer()
