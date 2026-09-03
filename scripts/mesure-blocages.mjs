// D2 — la fréquence du blocage manuel, par pro et par semaine.
//
// C'est le chiffre sur lequel la synchronisation Google Agenda sera décidée
// pendant la bêta : plusieurs blocages par semaine chez la majorité des
// testeuses vaut besoin confirmé ; quelques-uns par mois vaut « B4 suffit ».
//
// ⚠️ R2-4 — CE SCRIPT NE MODIFIE RIEN. Il lit, il compte, il affiche. Rien ne
// s'exécute au simple chargement du fichier : le corps ne tourne que lancé
// explicitement. Il n'a pas de mode d'essai parce qu'il n'a rien à essayer.
//
// Aucune donnée personnelle n'est affichée : un identifiant de pro tronqué, un
// nom d'affichage professionnel, des dates et des comptes. Pas de cliente, pas
// d'adresse, pas de motif de blocage (le motif est « pour toi seule », il ne
// sort pas de l'app).
//
// Usage : node scripts/mesure-blocages.mjs [--semaines 8]
import { lanceDirectement, env } from './garde.mjs'

/** Client REST minimal, en lecture seule : ce script n'écrit jamais. */
function lecture(valeurs) {
  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.')
  return async (chemin) => {
    const r = await fetch(`${url}/rest/v1/${chemin}`, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}` },
    })
    if (!r.ok) {
      const corps = await r.text()
      // Le cas courant, et il mérite mieux qu'un code HTTP : la colonne
      // `created_at` de `blocked_slots` arrive avec la migration 0011.
      if (corps.includes('created_at')) {
        throw new Error(
          'La colonne blocked_slots.created_at n’existe pas encore.\n' +
            'Applique la migration 0011_blocages_et_cloture.sql, puis relance.',
        )
      }
      throw new Error(`${chemin} : HTTP ${String(r.status)} ${corps}`)
    }
    return r.json()
  }
}

async function executer() {
  const lire = lecture(env())

  const index = process.argv.indexOf('--semaines')
  const semaines = index === -1 ? 8 : Math.max(1, Number(process.argv[index + 1] ?? 8))
  const depuis = new Date(Date.now() - semaines * 7 * 86_400_000).toISOString()

  const blocages = await lire(`blocked_slots?select=pro_id,created_at&created_at=gte.${depuis}`)
  const pros = await lire('pros?select=id,display_name')
  const nomDe = new Map(pros.map((p) => [p.id, p.display_name]))

  const parPro = new Map()
  for (const b of blocages) {
    parPro.set(b.pro_id, (parPro.get(b.pro_id) ?? 0) + 1)
  }

  console.log(
    `\nBlocages manuels sur ${String(semaines)} semaine(s), depuis le ${depuis.slice(0, 10)}\n`,
  )
  if (parPro.size === 0) {
    console.log('Aucun blocage sur la période.')
    console.log('\nÀ ce stade, rien ne justifie D2 : B4 suffit.\n')
    return
  }

  const lignes = [...parPro.entries()]
    .map(([id, total]) => ({
      pro: nomDe.get(id) ?? id.slice(0, 8),
      total,
      parSemaine: total / semaines,
    }))
    .sort((a, b) => b.parSemaine - a.parSemaine)

  for (const l of lignes) {
    console.log(
      `  ${l.pro.padEnd(28)} ${String(l.total).padStart(4)} blocages · ${l.parSemaine.toFixed(1)}/semaine`,
    )
  }

  // Le seuil de décision de D2, écrit ici pour qu'il ne se renégocie pas au
  // moment de lire le chiffre.
  const majorite = lignes.filter((l) => l.parSemaine >= 1).length
  const part = majorite / lignes.length
  console.log(
    `\n${String(majorite)} pro(s) sur ${String(lignes.length)} bloquent au moins une fois par semaine ` +
      `(${String(Math.round(part * 100))} %).`,
  )
  console.log(
    part > 0.5
      ? 'Au-dessus de la moitié : besoin confirmé, D2 monte en priorité.'
      : 'En dessous de la moitié : B4 suffit, D2 reste en attente.\n',
  )
}

// Rien ne s'exécute au simple chargement (R2-4) : importer ce script ne doit
// jamais interroger la base.
if (lanceDirectement(import.meta.url)) await executer()
