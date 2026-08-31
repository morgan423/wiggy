// D7 : « que voit le monde ? » Vérification en lecture seule d'un projet.
//
//   npm run verifier:vide
//
// Répond à une seule question : un visiteur anonyme voit-il quelque chose ?
// Elle sert deux fois. À la création de la production, en dernière étape avant
// l'ouverture, pour vérifier que le compte de vérification a bien été retiré.
// Et à tout moment ensuite, pour contrôler qu'aucune donnée de test n'a reparu.
//
// ELLE INTERROGE AVEC LA CLÉ ANONYME, jamais avec la clé service role. Deux
// raisons, et la seconde compte autant que la première :
//   ① c'est la seule qui réponde à la vraie question. La clé serveur contourne
//      la RLS : elle dirait ce que contient la base, pas ce que le monde voit.
//      Une fiche non publiée est invisible et n'a pas à faire échouer ;
//   ② elle évite de faire manipuler la clé serveur de production sur un poste
//      de développement, ce que D7 cherche précisément à empêcher.
//
// ELLE NE SUPPRIME RIEN. C'est une vérification, donc elle tombe sous la règle
// R2-4, et c'est pour cette raison qu'elle a le droit de tourner en production,
// contrairement à la purge.
import { lanceDirectement, env } from './garde.mjs'

/**
 * Ce qu'on interroge, et ce que ça voudrait dire d'en trouver.
 *
 * Chaque entrée est une lecture anonyme : soit une politique RLS l'autorise et
 * on compte, soit elle la refuse et le compte vaut zéro par construction.
 */
const REGARDS = [
  {
    table: 'pros',
    filtre: 'published=is.true',
    quoi: 'compte(s) pro publié(s)',
    consequence: 'une page de réservation est en ligne et visible par tous',
  },
  {
    table: 'appointments',
    filtre: '',
    quoi: 'rendez-vous visible(s)',
    consequence: 'des rendez-vous fuient : la RLS des rendez-vous est à revoir d’urgence',
  },
  {
    table: 'clients',
    filtre: '',
    quoi: 'fiche(s) cliente visible(s)',
    consequence: 'des données personnelles fuient : à traiter avant toute chose',
  },
  {
    table: 'city_waitlist',
    filtre: '',
    quoi: 'inscription(s) à la liste d’attente visible(s)',
    consequence: 'des adresses e-mail fuient : la table doit rester verrouillée',
  },
]

async function verifier() {
  const valeurs = env()
  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !cle) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis.')
    console.error('La clé ANONYME, pas la clé service role : c’est le regard du monde qu’on veut.')
    process.exit(1)
  }

  console.log(`Projet interrogé : ${url}`)
  console.log('Regard : visiteur anonyme, en lecture seule.\n')

  const subsiste = []
  for (const regard of REGARDS) {
    const chemin = `${url}/rest/v1/${regard.table}?select=id${regard.filtre ? `&${regard.filtre}` : ''}`
    const r = await fetch(chemin, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, Prefer: 'count=exact', Range: '0-0' },
    })
    // Un refus est une bonne nouvelle : la table n'est pas lisible du dehors.
    if (r.status === 401 || r.status === 403) {
      console.log(`  ✓ ${regard.table.padEnd(14)} inaccessible au visiteur anonyme`)
      continue
    }
    if (!r.ok) {
      console.error(`  ? ${regard.table.padEnd(14)} réponse inattendue : HTTP ${r.status}`)
      process.exit(1)
    }
    const total = Number((r.headers.get('content-range') ?? '').split('/')[1] ?? '0')
    if (total === 0) {
      console.log(`  ✓ ${regard.table.padEnd(14)} 0 ${regard.quoi}`)
    } else {
      console.log(`  ✖ ${regard.table.padEnd(14)} ${total} ${regard.quoi}`)
      subsiste.push({ ...regard, total })
    }
  }

  if (subsiste.length === 0) {
    console.log('\nRien de visible. Le projet est vierge aux yeux du monde.')
    return
  }

  // Nommer ce qui subsiste, plutôt que de dire « échec » et laisser chercher.
  console.error('\nCe projet n’est pas vierge. Subsistent :')
  for (const reste of subsiste) {
    console.error(`  ${reste.total} ${reste.quoi} : ${reste.consequence}.`)
  }
  console.error(
    '\nSur le développement, `npm run purge:compte -- --pro <slug>` retire les données de test.\n' +
      'Sur la production, la suppression se fait à la main depuis l’éditeur SQL : aucun script\n' +
      'destructeur n’y est autorisé (D7).',
  )
  process.exit(1)
}

if (lanceDirectement(import.meta.url)) await verifier()
