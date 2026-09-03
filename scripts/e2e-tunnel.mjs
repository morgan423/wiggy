// D8 : le test de bout en bout du tunnel de réservation.
//
//   npm run e2e
//
// Il ouvre un vrai navigateur et joue UN parcours nominal, de la page publique
// à la confirmation. Il échoue si une page plante ou si le parcours meurt en
// route. Il est branché dans `npm run verify` : un échec arrête la livraison.
//
// POURQUOI IL EXISTE. Deux recettes de suite ont été bloquées par des pannes
// que `verify` ne voyait pas : « Unexpected end of form » sur les photos, puis
// une fonction passée à un composant client au choix du créneau. Les deux
// n'existent qu'à l'exécution, dans un navigateur. La chaîne de qualité lisait
// le code sans jamais l'exécuter, et Morgan était devenu, de fait, le
// détecteur de plantages du projet.
//
// PÉRIMÈTRE, VOLONTAIREMENT ÉTROIT. Il vérifie que les écrans s'ouvrent et que
// le parcours va au bout. Il ne juge ni le ton, ni le design, ni la pertinence
// d'un message : cela reste la recette humaine, qui ne disparaît pas.
// **Il ne grossit pas sans décision.**
//
// DEUX CONDITIONS DE SURVIE, tenues ici.
//   ① Compte pro dédié et déterministe, et il EFFACE ce qu'il a créé, même
//      quand il échoue. Un test qui laisse des rendez-vous derrière lui pollue
//      le moteur géo et la recette suivante.
//   ② Il se met à jour avec les écrans qu'il traverse. Les repères attendus
//      sont rassemblés dans ÉTAPES, en un seul endroit : quand un écran change
//      de mot, c'est là et nulle part ailleurs qu'on le suit. Un test qui
//      échoue pour rien est ignoré au bout de trois fois, et un garde-fou
//      ignoré ne protège plus personne.
//
// Il écrit en base : il porte les gardes de la règle R2-4, et refuse de
// tourner ailleurs qu'en développement (D7).
import { chromium } from 'playwright-core'
import { lanceDirectement, env, exigerDeveloppement } from './garde.mjs'
import { preparerServeur } from './serveur-dev.mjs'

/** Compte de test : slug fixe, reconnaissable, et hors de portée d'un vrai pro. */
const SLUG = 'zzz-tunnel-e2e'
const COMPTE = '00000000-e2e0-4000-8000-000000000001'
const EMAIL = 'tunnel-e2e@wiggy.invalid'

/** Adresse réelle, dans la zone du compte de test. */
const ADRESSE = { ligne: '1 boulevard des Pyrénées', cp: '64000', ville: 'Pau' }
const COMMUNE = { insee: '64445', nom: 'Pau', lat: 43.2951, lng: -0.3708 }

/**
 * Les écrans traversés, et ce qui prouve qu'ils se sont ouverts.
 *
 * C'est la liste à tenir à jour quand un écran change de mot : ici, et nulle
 * part ailleurs dans ce fichier.
 */
const ETAPES = {
  pagePublique: 'Réserver avec',
  prestation: 'Que souhaitez-vous réserver',
  adresse: 'Où venir vous coiffer',
  creneaux: 'près de chez vous',
  photos: 'Des photos, si vous voulez',
  coordonnees: 'Vos coordonnées',
  confirmation: 'Votre rendez-vous est confirmé',
}

// ───────────────────────────────────────────────────────────────────────────
// Compte de test
// ───────────────────────────────────────────────────────────────────────────

function api(valeurs) {
  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.')
  const entetes = {
    apikey: cle,
    Authorization: `Bearer ${cle}`,
    'Content-Type': 'application/json',
  }

  return {
    url,
    entetes,
    async rest(chemin, options = {}) {
      const r = await fetch(`${url}/rest/v1/${chemin}`, {
        ...options,
        headers: { ...entetes, ...options.headers },
      })
      if (!r.ok) throw new Error(`${chemin} : HTTP ${r.status} ${await r.text()}`)
      const corps = await r.text()
      return corps ? JSON.parse(corps) : []
    },
    async auth(chemin, options = {}) {
      const r = await fetch(`${url}/auth/v1/${chemin}`, {
        ...options,
        headers: { ...entetes, ...options.headers },
      })
      // 422 : l'utilisateur existe déjà, reste d'une exécution interrompue.
      if (!r.ok && r.status !== 422) throw new Error(`auth/${chemin} : HTTP ${r.status}`)
      return r.ok ? r.json() : null
    },
  }
}

async function semer(client) {
  // On efface d'abord : une exécution interrompue laisse un compte derrière
  // elle, et repartir d'un état sale ne prouverait rien.
  await nettoyer(client)

  await client.auth('admin/users', {
    method: 'POST',
    body: JSON.stringify({
      id: COMPTE,
      email: EMAIL,
      password: `e2e-${COMPTE}`,
      email_confirm: true,
    }),
  })

  await client.rest('pros', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        id: COMPTE,
        slug: SLUG,
        display_name: 'Tunnel E2E',
        city: COMMUNE.nom,
        pronoun: 'elle',
        published: true,
      },
    ]),
  })

  const [prestation] = await client.rest('services', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      {
        pro_id: COMPTE,
        name: 'Coupe E2E',
        price_cents: 4200,
        duration_min: 45,
        active: true,
        // A4 : les photos sont désormais un réglage PAR PRESTATION, et l'étape
        // n'existe que si la prestation la demande. On la coche ici pour que le
        // parcours de bout en bout continue de traverser cette étape : c'est
        // le chemin le plus long, et c'est celui qu'un test doit tenir.
        photos_required: true,
      },
    ]),
  })

  await client.rest('service_areas', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ pro_id: COMPTE, mode: 'communes' }]),
  })
  await client.rest('service_area_communes', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        pro_id: COMPTE,
        insee_code: COMMUNE.insee,
        name: COMMUNE.nom,
        postal_code: ADRESSE.cp,
        lat: COMMUNE.lat,
        lng: COMMUNE.lng,
      },
    ]),
  })
  // Tous les jours ouvrés, largement : le parcours doit trouver un créneau
  // quel que soit le jour où le test tourne.
  await client.rest('working_hours', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        pro_id: COMPTE,
        weekday,
        starts_at: '08:00',
        ends_at: '19:00',
      })),
    ),
  })

  return { serviceId: prestation.id }
}

/** Efface tout ce que le test a pu créer. Appelé avant ET après, quoi qu'il arrive. */
async function nettoyer(client) {
  const restes = []

  // Les fichiers d'abord : rien ne les rattache une fois le compte parti.
  const lister = async (prefixe) => {
    const r = await fetch(`${client.url}/storage/v1/object/list/appointment-photos`, {
      method: 'POST',
      headers: client.entetes,
      body: JSON.stringify({ prefix: prefixe, limit: 1000 }),
    })
    return r.ok ? r.json() : []
  }
  const fichiers = []
  for (const dossier of await lister(`${COMPTE}/`)) {
    for (const f of await lister(`${COMPTE}/${dossier.name}/`)) {
      fichiers.push(`${COMPTE}/${dossier.name}/${f.name}`)
    }
  }
  if (fichiers.length > 0) {
    await fetch(`${client.url}/storage/v1/object/appointment-photos`, {
      method: 'DELETE',
      headers: client.entetes,
      body: JSON.stringify({ prefixes: fichiers }),
    })
    restes.push(`${fichiers.length} photo(s)`)
  }

  // Le compte : `pros` cascade sur prestations, zone, horaires, rendez-vous,
  // fiches clientes. L'utilisateur d'authentification ne cascade pas.
  const rdvs = await client.rest(`appointments?pro_id=eq.${COMPTE}&select=id`).catch(() => [])
  if (rdvs.length > 0) restes.push(`${rdvs.length} rendez-vous`)
  // Un nettoyage qui échoue ne doit pas masquer l'échec du parcours lui-même :
  // on avale, on ne relance pas.
  const avaler = (e) => console.error('  nettoyage partiel :', e.message)
  await client.rest(`pros?id=eq.${COMPTE}`, { method: 'DELETE' }).catch(avaler)
  await client.auth(`admin/users/${COMPTE}`, { method: 'DELETE' }).catch(avaler)

  return restes
}

// ───────────────────────────────────────────────────────────────────────────
// Le parcours
// ───────────────────────────────────────────────────────────────────────────

async function jouer(base, page) {
  const voir = async (etape) => {
    const repere = ETAPES[etape]
    try {
      await page.getByText(repere, { exact: false }).first().waitFor({ timeout: 15_000 })
    } catch {
      const titre = await page.title().catch(() => '?')
      throw new Error(
        `Écran « ${etape} » introuvable. Attendu : « ${repere} ». ` +
          `Page : « ${titre} », URL : ${page.url()}`,
      )
    }
    console.log(`  ✓ ${etape}`)
  }

  // Toute erreur de rendu du navigateur fait échouer le test : c'est
  // exactement ce que les deux recettes bloquées avaient laissé passer.
  const erreurs = []
  page.on('pageerror', (e) => erreurs.push(e.message))

  await page.goto(`${base}/${SLUG}`, { waitUntil: 'domcontentloaded' })
  await voir('pagePublique')

  // Planche 15a : le CTA est collant en bas d'écran et il est réécrit.
  // « Réserver » sec en entrée de page ne disait ni quoi, ni avec qui.
  await page.getByRole('link', { name: /Trouver un moment avec/i }).click()
  await voir('prestation')

  await page.getByText('Coupe E2E').click()
  await voir('adresse')

  // B12 : l'adresse passe par la saisie assistée. On tape, on attend les
  // propositions de la BAN, et on choisit la première. C'est le parcours réel
  // d'une cliente, y compris sa dépendance à un service tiers : si la BAN ne
  // répond pas, ce test tombe, et c'est exactement ce qu'on veut savoir.
  await page.locator('#adresse').fill(`${ADRESSE.ligne} ${ADRESSE.cp}`)
  const proposition = page.locator('[role="option"]').first()
  await proposition.waitFor({ state: 'visible', timeout: 15_000 })
  await proposition.click()
  await page.getByRole('button', { name: /Voir les créneaux/i }).click()
  await voir('creneaux')

  // Le premier créneau proposé, quel qu'il soit.
  await page.locator('main a[href*="&c="], main a[href*="?c="]').first().click()
  await voir('photos')

  // On traverse l'étape sans photo : le dépôt par URL signée a son propre
  // chemin, et l'ajouter ici ferait de ce test une suite, pas un parcours.
  await page.getByRole('button', { name: /Continuer sans photo/i }).click()
  await voir('coordonnees')

  await page.locator('#prenom').fill('Cliente E2E')
  await page.locator('#telephone').fill('0612345678')
  await page.getByRole('button', { name: /Réserver ce créneau|Envoyer la demande/i }).click()
  await voir('confirmation')

  if (erreurs.length > 0) {
    throw new Error(`Erreurs JavaScript pendant le parcours :\n  ${erreurs.join('\n  ')}`)
  }
}

// ───────────────────────────────────────────────────────────────────────────

async function executer() {
  const valeurs = env()
  // Le test crée un compte pro, réserve, puis efface tout : il écrit et il
  // supprime. Jamais ailleurs qu'en développement.
  if (!(valeurs.WIGGY_ENV ?? process.env.WIGGY_ENV)) {
    console.error('Le test de bout en bout (D8) crée puis efface un compte pro de test.')
    console.error('Il lui faut donc savoir sur quel projet il tourne.\n')
  }
  exigerDeveloppement(valeurs)

  const client = api(valeurs)
  const serveur = await preparerServeur()
  let navigateur
  let echec

  try {
    await semer(client)
    console.log(`Compte de test semé : /${SLUG}`)
    navigateur = await chromium.launch({ channel: 'chrome' })
    const page = await navigateur.newPage()
    await jouer(serveur.base, page)
    console.log('\nTunnel de réservation : parcours nominal complet.')
  } catch (e) {
    echec = e
  } finally {
    await navigateur?.close().catch((e) => console.error('fermeture du navigateur :', e.message))
    const restes = await nettoyer(client).catch((e) => {
      console.error('Nettoyage incomplet :', e.message)
      return []
    })
    if (restes.length > 0) console.log(`Nettoyé : ${restes.join(', ')}, et le compte de test.`)
    else console.log('Nettoyé : le compte de test.')
    serveur.arreter()
  }

  if (echec) {
    console.error(`\n✖ ${echec.message}`)
    process.exit(1)
  }
}

if (lanceDirectement(import.meta.url)) await executer()
