// `npm run db:etat` — quelles migrations sont RÉELLEMENT appliquées.
//
// LE PROBLÈME QU'IL RÉSOUT : `supabase/ETAT.md` est un registre DÉCLARATIF,
// coché à la main. Le 03/09, un lot collé plusieurs heures plus tôt avait
// laissé Morgan sans savoir s'il était passé, et il a fallu reconstituer l'état
// réel par déduction, à coups de requêtes écrites à la main. À vingt migrations
// appliquées manuellement, ce n'est plus tenable.
//
// Le registre garde sa valeur d'historique et de commentaire. Sa colonne
// « appliquée » devient vérifiable, et **quand elle diverge du constat, c'est
// le constat qui a raison.**
//
// ⚠️ R2-4 — LECTURE SEULE ABSOLUE, et par CONSTRUCTION et non par discipline :
// on n'interroge la base que par des `GET` PostgREST. Ce protocole ne sait pas
// écrire. Il n'existe aucune ligne de ce script capable de modifier quoi que ce
// soit, même par erreur, même si quelqu'un le modifiait sans réfléchir.
//
// COMMENT ON SAIT : nous n'avons pas de table de migrations, puisqu'on applique
// à la main dans l'éditeur web. Chaque migration déclare donc une SONDE en
// tête, `-- @sonde: table` ou `-- @sonde: table.colonne` : un objet qui n'existe
// QU'APRÈS elle. C'est explicite et lisible, là où deviner la sonde en
// analysant le SQL serait fragile et silencieusement faux le jour où une
// migration ne créerait rien de nouveau.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { lanceDirectement, env } from './garde.mjs'
import { migrationsDir, listMigrations } from './db.mjs'

/**
 * Les migrations 0001 à 0016 sont APPLIQUÉES, et une migration appliquée ne se
 * réécrit jamais. Leurs sondes vivent donc ici plutôt que dans leur en-tête :
 * ajouter une ligne à un fichier gelé, même un commentaire, serait ouvrir la
 * porte à y ajouter autre chose.
 *
 * À partir de 0017, la sonde est dans le fichier. `npm run db:rejeu` échoue si
 * elle manque.
 */
const SONDES_GELEES = {
  '0001': 'sms_usage',
  '0002': 'pro_settings',
  '0003': 'city_waitlist',
  '0004': 'subscriptions',
  '0005': 'rate_limits',
  '0006': 'geocodage_refus',
  '0007': 'appointments.public_token',
  '0008': 'communes_import',
  '0009': 'phone_verifications',
  '0010': 'pros.mode',
  '0011': 'blocked_slots.created_at',
  '0012': 'sms_usage.alerted_at',
  '0013': 'pro_photos',
  '0014': 'journees',
  '0015': 'pros.start_lat',
  '0016': 'appointments.duration_declared',
}

export function sondeDe(nom, contenu) {
  const declaree = /^--\s*@sonde:\s*(.+)$/m.exec(contenu)?.[1].trim()
  return declaree ?? SONDES_GELEES[nom.slice(0, 4)] ?? null
}

/** Interroge PostgREST. `GET` uniquement : ce protocole ne sait pas écrire. */
function lecteur(valeurs) {
  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.')
  return {
    url,
    async existe(sonde) {
      /*
        Deux formes de sonde, parce que deux formes de migration.

        · `table` ou `table.colonne` : un OBJET de schéma. C'est le cas courant.
        · `table?filtre` : une LIGNE. Une migration qui n'ajoute aucun objet —
          une nouvelle version de texte contractuel, par exemple — n'a rien
          d'autre à quoi se reconnaître. Sans cette seconde forme, elle
          emprunterait la sonde d'une migration précédente et se déclarerait
          appliquée alors qu'elle ne l'est pas : `db:etat` mentirait, ce qui est
          pire qu'un `db:etat` absent.

        La lecture reste un `GET` : toujours en lecture seule par construction.
      */
      const [avantFiltre, filtre] = sonde.split('?')
      const [table, colonne] = avantFiltre.split('.')
      const chemin = filtre
        ? `${url}/rest/v1/${table}?${filtre}&select=*&limit=1`
        : `${url}/rest/v1/${table}?select=${colonne ?? '*'}&limit=0`
      const r = await fetch(chemin, { headers: { apikey: cle, Authorization: `Bearer ${cle}` } })
      // 200 : la table et la colonne existent. 404 : pas de table.
      // 400 : la table existe mais pas la colonne. Toute autre réponse est une
      // panne, et une panne ne se lit pas comme une absence.
      if (r.ok) {
        // Une sonde de LIGNE répond 200 même quand la ligne manque : c'est le
        // tableau vide qui dit l'absence, pas le code HTTP.
        if (filtre) return ((await r.json()) ?? []).length > 0
        return true
      }
      if (r.status === 404 || r.status === 400) return false
      throw new Error(`${sonde} : HTTP ${String(r.status)}`)
    },
  }
}

async function executer() {
  const valeurs = env()
  const base = lecteur(valeurs)

  // CONTRAINTE : dire QUELLE base on regarde. Avec deux projets Supabase (D7),
  // un script qui annonce « tout est appliqué » sans dire où serait pire que
  // pas de script du tout.
  const projet = new URL(base.url).hostname
  console.log(`\nBase interrogée : ${projet}`)
  console.log(`Environnement déclaré : ${valeurs.WIGGY_ENV ?? 'non déclaré'}\n`)

  const fichiers = await listMigrations()
  const sansSonde = []
  const appliquees = []
  const manquantes = []

  for (const f of fichiers) {
    const sonde = sondeDe(f, await readFile(join(migrationsDir, f), 'utf8'))
    if (!sonde) {
      sansSonde.push(f)
      console.log(`  ?    ${f}  (aucune sonde déclarée)`)
      continue
    }
    const passee = await base.existe(sonde)
    ;(passee ? appliquees : manquantes).push(f)
    console.log(`  ${passee ? 'ok  ' : '✖   '} ${f}  (${sonde})`)
  }

  console.log(
    `\n${String(appliquees.length)} appliquée(s), ${String(manquantes.length)} en attente` +
      (sansSonde.length > 0 ? `, ${String(sansSonde.length)} sans sonde` : '') +
      ` sur ${projet}.`,
  )

  if (manquantes.length > 0) {
    console.log('\nÀ coller, dans cet ordre :')
    for (const f of manquantes) console.log(`  ${f}`)
    console.log(
      `\n  node scripts/db-bundle.mjs --depuis ${manquantes[0].slice(0, 4)}\n` +
        '\nLes migrations sont idempotentes : recoller un lot entier ne coûte rien.',
    )
  }

  console.log(
    '\nCe constat prime sur supabase/ETAT.md : le registre est déclaratif, celui-ci' +
      '\nregarde la base. En cas de divergence, corrige le registre.\n',
  )
}

// Rien ne s'exécute au simple chargement (R2-4) : `db-rejeu` importe `sondeDe`,
// et l'importer ne doit pas interroger une base.
if (lanceDirectement(import.meta.url)) await executer()
