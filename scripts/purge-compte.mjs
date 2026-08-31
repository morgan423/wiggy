// D7 : purge les données de test d'UN compte pro, sur le développement.
//
// Dispense d'écrire du SQL de suppression à la main entre deux recettes.
//
//   npm run purge:compte -- --pro lea-martin
//       Mode d'essai, celui par défaut : compte et affiche, ne supprime rien.
//
//   npm run purge:compte -- --pro lea-martin --appliquer
//       Supprime, après avoir fait retaper le slug.
//
//   npm run purge:compte -- --pro lea-martin --email test@exemple.fr --appliquer
//       Retire en plus les inscriptions à la liste d'attente de cette adresse.
//
// CE QUI EST SUPPRIMÉ : rendez-vous, photos qui leur sont attachées (lignes et
// fichiers), fiches clientes et leurs adresses, inscriptions à la liste
// d'attente de l'adresse donnée.
//
// CE QUI NE L'EST PAS : le compte lui-même, ses prestations, sa zone, ses
// horaires, ses congés, ses réglages, son abonnement. C'est le paramétrage,
// pas de la donnée de test : on purge pour rejouer une recette, pas pour
// tout reconfigurer. Et **jamais** la table des communes, qui est un
// référentiel partagé que rien ne rattache à un compte.
//
// Ce script SUPPRIME : il porte les trois gardes de la règle R2-4. Rien ne
// s'exécute à son chargement, le mode d'essai est le défaut, et il refuse de
// tourner ailleurs qu'en développement.
import { createInterface } from 'node:readline/promises'
import { lanceDirectement, modeEssai, env, exigerDeveloppement } from './garde.mjs'

const SEAU = 'appointment-photos'

const argument = (nom, argv = process.argv) => {
  const i = argv.indexOf(nom)
  return i >= 0 ? argv[i + 1] : undefined
}

async function purger({ slug, email, essai }) {
  if (!slug) {
    console.error('Indiquer le compte : --pro <slug>')
    process.exit(1)
  }

  const valeurs = env()
  // La production porte les fiches de vraies clientes. Elle ne sert jamais à
  // une recette, et rien ne s'y supprime depuis un poste de développement.
  if (!essai) exigerDeveloppement(valeurs)

  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
    process.exit(1)
  }
  const entetes = {
    apikey: cle,
    Authorization: `Bearer ${cle}`,
    'Content-Type': 'application/json',
  }

  const rest = async (chemin, options = {}) => {
    const r = await fetch(`${url}/rest/v1/${chemin}`, {
      ...options,
      headers: { ...entetes, ...options.headers },
    })
    if (!r.ok) throw new Error(`${chemin} : HTTP ${r.status} ${await r.text()}`)
    const corps = await r.text()
    return corps ? JSON.parse(corps) : []
  }

  const [pro] = await rest(`pros?slug=eq.${encodeURIComponent(slug)}&select=id,slug,display_name`)
  if (!pro) {
    console.error(`Aucun compte pro avec le slug « ${slug} ».`)
    process.exit(1)
  }

  // ── Inventaire, avant toute suppression ──────────────────────────────────
  const rdvs = await rest(`appointments?pro_id=eq.${pro.id}&select=id`)
  const clientes = await rest(`clients?pro_id=eq.${pro.id}&select=id`)
  const attente = email
    ? await rest(`city_waitlist?email=eq.${encodeURIComponent(email)}&select=id`)
    : []

  const listerFichiers = async (prefixe) => {
    const r = await fetch(`${url}/storage/v1/object/list/${SEAU}`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({ prefix: prefixe, limit: 1000 }),
    })
    if (!r.ok) throw new Error(`list ${prefixe} : HTTP ${r.status}`)
    return r.json()
  }
  const fichiers = []
  for (const dossier of await listerFichiers(`${pro.id}/`)) {
    for (const fichier of await listerFichiers(`${pro.id}/${dossier.name}/`)) {
      fichiers.push(`${pro.id}/${dossier.name}/${fichier.name}`)
    }
  }

  console.log(`Compte : ${pro.display_name} (${pro.slug})`)
  console.log(`  rendez-vous ............. ${rdvs.length}`)
  console.log(`  fiches clientes ......... ${clientes.length}`)
  console.log(`  photos (fichiers) ....... ${fichiers.length}`)
  console.log(
    `  liste d'attente ......... ${attente.length}${email ? '' : ' (aucun e-mail donné)'}`,
  )
  console.log(
    '  conservés ............... prestations, zone, horaires, congés, réglages, abonnement',
  )

  const total = rdvs.length + clientes.length + fichiers.length + attente.length
  if (total === 0) {
    console.log('\nRien à supprimer.')
    return
  }

  if (essai) {
    console.log("\nMode d'essai : rien n'a été supprimé.")
    console.log('Relancer avec --appliquer pour supprimer réellement.')
    return
  }

  // ── Confirmation explicite ───────────────────────────────────────────────
  if (process.stdin.isTTY) {
    const lecture = createInterface({ input: process.stdin, output: process.stdout })
    const reponse = await lecture.question(`\nRetaper le slug « ${pro.slug} » pour confirmer : `)
    lecture.close()
    if (reponse.trim() !== pro.slug) {
      console.error('Slug non confirmé. Rien n’a été supprimé.')
      process.exit(1)
    }
  } else if (argument('--confirmer') !== pro.slug) {
    console.error(`Hors terminal, confirmer avec --confirmer ${pro.slug}. Rien n’a été supprimé.`)
    process.exit(1)
  }

  // ── Suppression, dans l'ordre des dépendances ────────────────────────────
  // Les fichiers d'abord : une fois les rendez-vous partis, plus rien ne dit
  // quels fichiers leur appartenaient.
  if (fichiers.length > 0) {
    const r = await fetch(`${url}/storage/v1/object/${SEAU}`, {
      method: 'DELETE',
      headers: entetes,
      body: JSON.stringify({ prefixes: fichiers }),
    })
    if (!r.ok) throw new Error(`suppression des photos : HTTP ${r.status}`)
  }
  // Les rendez-vous ensuite : `appointment_photos` part en cascade. Avant les
  // fiches, dont la suppression ne ferait que détacher les rendez-vous.
  await rest(`appointments?pro_id=eq.${pro.id}`, { method: 'DELETE' })
  await rest(`clients?pro_id=eq.${pro.id}`, { method: 'DELETE' })
  if (email) await rest(`city_waitlist?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE' })

  console.log('\nSupprimé :')
  console.log(`  ${rdvs.length} rendez-vous`)
  console.log(`  ${clientes.length} fiche(s) cliente et leurs adresses`)
  console.log(`  ${fichiers.length} photo(s)`)
  if (email) console.log(`  ${attente.length} inscription(s) à la liste d'attente de ${email}`)
  console.log(`\nLe paramétrage de ${pro.display_name} est intact : la recette peut repartir.`)
}

if (lanceDirectement(import.meta.url)) {
  await purger({
    slug: argument('--pro'),
    email: argument('--email'),
    essai: modeEssai(),
  })
}
