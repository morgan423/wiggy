// `npm run vues` : chaque écran, dans chaque état, en capture d'écran.
//
//   npm run vues            capture, contrôle le contraste, échoue si illisible
//   npm run vues -- --ouvrir  ouvre le dossier à la fin (macOS)
//
// POURQUOI. Recetter vingt écrans à la main coûte vingt parcours cliqués.
// Avec ce dossier, c'est vingt images à comparer à vingt planches du board,
// côte à côte, en une fois. C'est l'outil de recette des écrans respécifiés.
//
// ET SURTOUT, le contrôle de contraste. Trois défauts de la semaine
// n'existaient qu'à l'écran, dont du blanc cassé sur du crème que `verify` a
// laissé passer au vert. Le typage voit des classes, le lint voit du code, les
// tests voient des fonctions : aucun ne voit une couleur posée sur une autre.
// Cette commande, si.
//
// Elle sème deux comptes de test, un fourni et un vide, et les EFFACE en fin
// de parcours, même quand elle échoue. Elle porte les gardes de la règle R2-4
// et refuse de tourner ailleurs qu'en développement (D7).
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { lanceDirectement, env, exigerDeveloppement } from './garde.mjs'
import { preparerServeur } from './serveur-dev.mjs'
import { releverContrastes, juger, SEUILS } from './contraste.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = join(racine, 'captures')

/** Deux comptes : ce que voit une pro installée, et ce que voit une pro le jour un. */
const COMPTES = {
  rempli: {
    id: '00000000-0000-4000-8000-00000000e001',
    slug: 'zzz-vues-rempli',
    nom: 'Vues Remplie',
    email: 'vues-rempli@wiggy.invalid',
  },
  vide: {
    id: '00000000-0000-4000-8000-00000000e002',
    slug: 'zzz-vues-vide',
    nom: 'Vues Vide',
    email: 'vues-vide@wiggy.invalid',
  },
}
const MOT_DE_PASSE = 'vues-wiggy-developpement'

const COMMUNE = { insee: '64445', nom: 'Pau', cp: '64000', lat: 43.2951, lng: -0.3708 }
const ADRESSE = { ligne: '1 boulevard des Pyrénées', cp: '64000', ville: 'Pau' }

/**
 * Les vues capturées. Une ligne = une image.
 *
 * C'est la liste à tenir quand un écran naît ou change d'adresse : ici, et
 * nulle part ailleurs. Un inventaire éparpillé finit incomplet.
 */
const VUES = [
  // Espace pro, compte fourni
  { nom: '01-pro-hub-rempli', compte: 'rempli', url: '/app/parametrage' },
  { nom: '02-pro-prestations-rempli', compte: 'rempli', url: '/app/parametrage/prestations' },
  { nom: '03-pro-zone-rempli', compte: 'rempli', url: '/app/parametrage/zone' },
  { nom: '04-pro-horaires-rempli', compte: 'rempli', url: '/app/parametrage/horaires' },
  { nom: '05-pro-conges-rempli', compte: 'rempli', url: '/app/parametrage/conges' },
  { nom: '06-pro-profil-rempli', compte: 'rempli', url: '/app/parametrage/profil' },
  { nom: '07-pro-agenda', compte: 'rempli', url: '/app/agenda' },
  { nom: '08-pro-rendez-vous', compte: 'rempli', url: '/app/agenda/{rdv}' },
  { nom: '08b-pro-clientes', compte: 'rempli', url: '/app/clientes' },
  { nom: '08c-pro-fiche-cliente', compte: 'rempli', url: '/app/clientes/{cliente}' },
  { nom: '08d-pro-bloquer', compte: 'rempli', url: '/app/agenda/bloquer' },
  { nom: '08e-pro-paiement', compte: 'rempli', url: '/app/parametrage/paiement' },
  { nom: '08f-pro-notifications', compte: 'rempli', url: '/app/notifications' },
  { nom: '08g-pro-abonnement', compte: 'rempli', url: '/app/abonnement' },
  { nom: '09-pro-agenda-nouveau', compte: 'rempli', url: '/app/agenda/nouveau' },
  { nom: '10-pro-tournee', compte: 'rempli', url: '/app/tournee' },
  { nom: '11-pro-accueil', compte: 'rempli', url: '/app' },
  { nom: '12-galerie-composants', compte: 'rempli', url: '/app/galerie' },
  // Espace pro, compte du jour un : les états vides
  { nom: '13-pro-hub-vide', compte: 'vide', url: '/app/parametrage' },
  { nom: '14-pro-prestations-vide', compte: 'vide', url: '/app/parametrage/prestations' },
  { nom: '15-pro-zone-vide', compte: 'vide', url: '/app/parametrage/zone' },
  { nom: '16-pro-horaires-vide', compte: 'vide', url: '/app/parametrage/horaires' },
  { nom: '17-pro-conges-vide', compte: 'vide', url: '/app/parametrage/conges' },
  // Web cliente, sans compte
  { nom: '18-site-accueil', url: '/' },
  { nom: '19-site-recherche', url: '/recherche?ville=Pau' },
  { nom: '20-cliente-page-publique', url: `/${COMPTES.rempli.slug}` },
  { nom: '21-cliente-prestation', url: `/${COMPTES.rempli.slug}/reserver` },
  {
    nom: '22-cliente-adresse',
    url: `/${COMPTES.rempli.slug}/reserver?p={service}`,
  },
  {
    nom: '23-cliente-creneaux',
    url: `/${COMPTES.rempli.slug}/reserver?p={service}&a=${encodeURIComponent(ADRESSE.ligne)}&cp=${ADRESSE.cp}&v=${ADRESSE.ville}`,
  },
]

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
      if (!r.ok && r.status !== 422) throw new Error(`auth/${chemin} : HTTP ${r.status}`)
      return r.ok ? r.json() : null
    },
  }
}

async function semer(client) {
  await nettoyer(client)

  for (const compte of Object.values(COMPTES)) {
    await client.auth('admin/users', {
      method: 'POST',
      body: JSON.stringify({
        id: compte.id,
        email: compte.email,
        password: MOT_DE_PASSE,
        email_confirm: true,
      }),
    })
    await client.rest('pros', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          id: compte.id,
          slug: compte.slug,
          display_name: compte.nom,
          city: COMMUNE.nom,
          pronoun: 'elle',
          headline: 'Coiffure à domicile, agglomération de Pau',
          published: true,
        },
      ]),
    })
  }

  const { id } = COMPTES.rempli
  const [prestation] = await client.rest('services', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      { pro_id: id, name: 'Coupe et brushing', price_cents: 4500, duration_min: 45, active: true },
      { pro_id: id, name: 'Couleur et soin', price_cents: 7500, duration_min: 90, active: true },
    ]),
  })
  await client.rest('service_areas', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ pro_id: id, mode: 'communes' }]),
  })
  await client.rest('service_area_communes', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        pro_id: id,
        insee_code: COMMUNE.insee,
        name: COMMUNE.nom,
        postal_code: COMMUNE.cp,
        lat: COMMUNE.lat,
        lng: COMMUNE.lng,
      },
    ]),
  })
  await client.rest('working_hours', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        pro_id: id,
        weekday,
        starts_at: '09:00',
        ends_at: '18:00',
      })),
    ),
  })
  const dans = (jours) => new Date(Date.now() + jours * 86_400_000).toISOString()
  await client.rest('time_off', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([
      { pro_id: id, starts_at: dans(40), ends_at: dans(54), label: 'Vacances d’été' },
    ]),
  })

  // Une journée réelle, sinon l'agenda et la tournée se capturent toujours
  // vides et leurs états remplis ne sont jamais regardés. C'est exactement
  // comme ça que leur écart aux planches 16a et 16d est passé inaperçu.
  const clientes = await client.rest('clients?select=id,first_name', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      { pro_id: id, first_name: 'Marie', last_name: 'L.', technical_notes: null },
      {
        pro_id: id,
        first_name: 'Chantal',
        last_name: 'M.',
        technical_notes:
          'Formule couleur 6.35 + 20 vol. Temps de pose 35 min. Shampooing sans sulfate.',
      },
      { pro_id: id, first_name: 'Amélie', last_name: 'D.', technical_notes: null },
      { pro_id: id, first_name: 'Léa', last_name: 'B.', technical_notes: null },
    ]),
  })
  const min = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString()
  const lieu = {
    address_line1: `12 rue des Lilas`,
    postal_code: COMMUNE.cp,
    city: COMMUNE.nom,
    lat: COMMUNE.lat,
    lng: COMMUNE.lng,
  }
  // Toutes les lignes portent exactement les mêmes clés : PostgREST refuse un
  // lot dont les objets diffèrent (PGRST102).
  const rdv = (cliente, debut, fin, status, horsZone = false) => ({
    pro_id: id,
    client_id: cliente.id,
    service_id: prestation.id,
    service_name: prestation.name,
    price_cents: prestation.price_cents,
    starts_at: debut,
    ends_at: fin,
    status,
    source: 'online',
    out_of_zone: horsZone,
    ...lieu,
  })
  const rdvs = await client.rest('appointments?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      // Terminé, en cours, à venir : les trois pastilles de la planche 16a,
      // et le fil de pastilles de 16d, quelle que soit l'heure de la capture.
      rdv(clientes[0], min(-180), min(-120), 'done'),
      rdv(clientes[1], min(-30), min(30), 'in_progress'),
      rdv(clientes[2], min(150), min(210), 'confirmed'),
      // Une demande qui attend une décision : la carte abricot de 16a.
      rdv(clientes[3], dans(5), min(5 * 1440 + 60), 'conditional', true),
    ]),
  })

  /*
    Le JOURNAL de la cloche (B14, planche 18a).

    Sans lui, la cloche se capturait toujours sans badge, et ni le compte ni le
    plafond « 9+ » n'étaient jamais rendus par un vrai écran : deux états
    dessinés sur la planche que personne n'aurait vus tourner. C'est exactement
    ce qui avait laissé passer les divergences de l'agenda, quand le semis ne
    créait aucun rendez-vous.

    ONZE lignes non lues, dont une lue : onze dépasse neuf, donc la capture
    prouve le plafond « 9+ » et pas seulement le compte.
  */
  const journal = (kind, titre, detail, lien, lu = null) => ({
    pro_id: id,
    kind,
    titre,
    detail,
    lien,
    lu_le: lu,
  })
  await client.rest('notifications', {
    method: 'POST',
    body: JSON.stringify([
      ...Array.from({ length: 10 }, (_, i) =>
        journal(
          'reponse_proposition',
          `Réponse à ta proposition (${String(i + 1)})`,
          'Le nouveau créneau convient.',
          '/app/agenda',
        ),
      ),
      journal('acompte_recu', 'Acompte reçu', '10,00 € encaissés.', '/app/agenda'),
      journal('avis_recu', 'Nouvel avis', 'Cinq étoiles.', null, new Date().toISOString()),
    ]),
  })

  // Le rendez-vous en cours : c'est lui qu'on ouvre pour capturer la
  // consultation de la planche 16b.
  return { serviceId: prestation.id, rdvId: rdvs[1].id, clienteId: clientes[1].id }
}

async function nettoyer(client) {
  for (const compte of Object.values(COMPTES)) {
    await client.rest(`pros?id=eq.${compte.id}`, { method: 'DELETE' }).catch(() => undefined)
    await client.auth(`admin/users/${compte.id}`, { method: 'DELETE' }).catch(() => undefined)
  }
}

/** Connexion par le vrai formulaire : c'est le chemin que suit une pro. */
async function connecter(page, base, compte) {
  await page.goto(`${base}/connexion`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(compte.email)
  await page.locator('#motDePasse').fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('/connexion'), { timeout: 20_000 })
}

// ───────────────────────────────────────────────────────────────────────────

async function executer() {
  const valeurs = env()
  exigerDeveloppement(valeurs)

  const client = api(valeurs)
  const serveur = await preparerServeur(3011)
  let navigateur
  let echec
  const illisiblesGlobal = []
  const aaGlobal = []
  const capturees = []

  try {
    await rm(DOSSIER, { recursive: true, force: true })
    await mkdir(DOSSIER, { recursive: true })

    const { serviceId, rdvId, clienteId } = await semer(client)
    console.log('Comptes de test semés.\n')

    navigateur = await chromium.launch({ channel: 'chrome' })
    // Un mobile d'abord : c'est l'écran de vérité du produit.
    // 390 : la largeur de référence de la spécification. Le mobile fait foi.
    const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })

    let connecte = null
    for (const vue of VUES) {
      if (vue.compte && connecte !== vue.compte) {
        await connecter(page, serveur.base, COMPTES[vue.compte])
        connecte = vue.compte
      }
      if (!vue.compte && connecte) {
        // Les écrans publics se regardent sans session : sinon on capture ce
        // que voit une pro connectée, pas ce que voit une cliente.
        await page.context().clearCookies()
        connecte = null
      }

      const url =
        serveur.base +
        vue.url
          .replace('{service}', serviceId)
          .replace('{rdv}', rdvId)
          .replace('{cliente}', clienteId)
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => undefined)

      const releves = await releverContrastes(page)
      const { illisibles, souslAA } = juger(releves)
      for (const r of illisibles) illisiblesGlobal.push({ vue: vue.nom, ...r })
      for (const r of souslAA) aaGlobal.push({ vue: vue.nom, ...r })

      // La barre de navigation est fixée au bas de l'écran : dans une capture
      // de page entière, elle s'imprimait au milieu de l'image, par-dessus le
      // contenu. On la repose en flux le temps de la photo, elle revient donc
      // à sa place naturelle, en bas. La recette se fait sur ces images : une
      // barre en travers du contenu la rendrait illisible.
      await page.addStyleTag({
        content: '[data-nav-fixe]{position:static !important;}',
      })

      const fichier = join(DOSSIER, `${vue.nom}.png`)
      await page.screenshot({ path: fichier, fullPage: true })
      capturees.push(vue)
      const marque = illisibles.length > 0 ? '✖' : souslAA.length > 0 ? '⚠' : '✓'
      console.log(`  ${marque} ${vue.nom}`)
    }

    await writeFile(
      join(DOSSIER, 'index.md'),
      `# Vues du ${new Date().toISOString().slice(0, 10)}\n\n` +
        'Captures pour la recette, à comparer aux planches du board\n' +
        '(`packages/copy/reference-board-phase2.html`). Régénérées par `npm run vues`.\n\n' +
        'Aucune donnée réelle : deux comptes de test, semés puis effacés.\n\n' +
        capturees.map((v) => `- \`${v.nom}.png\` : ${v.url}`).join('\n') +
        '\n',
    )
  } catch (e) {
    echec = e
  } finally {
    await navigateur?.close().catch(() => undefined)
    await nettoyer(client).catch((e) => console.error('nettoyage partiel :', e.message))
    console.log('\nNettoyé : les deux comptes de test.')
    serveur.arreter()
  }

  if (echec) {
    console.error(`\n✖ ${echec.message}`)
    process.exit(1)
  }

  console.log(`${capturees.length} vues dans ${DOSSIER}`)

  if (aaGlobal.length > 0) {
    console.warn(`\n⚠ ${aaGlobal.length} texte(s) sous le niveau AA, non bloquant :`)
    for (const r of aaGlobal.slice(0, 12)) {
      console.warn(`   ${r.vue} · ${r.ratio}:1 · « ${r.texte} » (${r.couleur} sur ${r.fond})`)
    }
    if (aaGlobal.length > 12) console.warn(`   … et ${aaGlobal.length - 12} autres.`)
  }

  if (illisiblesGlobal.length > 0) {
    console.error(
      `\n✖ ${illisiblesGlobal.length} texte(s) ILLISIBLES ` +
        `(sous ${SEUILS.bloquantCourant}:1, ou ${SEUILS.bloquantGrand}:1 en grand) :`,
    )
    for (const r of illisiblesGlobal) {
      console.error(
        `   ${r.vue} · ${r.ratio}:1 · ${r.balise} « ${r.texte} »\n` +
          `      ${r.couleur} sur ${r.fond}, ${r.taille} px${r.classes ? ` · ${r.classes}` : ''}`,
      )
    }
    process.exit(1)
  }

  console.log('Contraste : aucun texte illisible.')
  if (process.argv.includes('--ouvrir')) {
    const { spawn } = await import('node:child_process')
    spawn('open', [DOSSIER], { stdio: 'ignore', detached: true }).unref()
  }
}

if (lanceDirectement(import.meta.url)) await executer()
