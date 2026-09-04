// Génère la matrice d'accès depuis le schéma lui-même : elle ne peut pas
// dériver du code, contrairement à un tableau tenu à la main.
// `npm run db:matrice` → docs/matrice-acces.md
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from './db.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const db = await createDb()

const { rows: tables } = await db.query(`
  select tablename, rowsecurity from pg_tables
  where schemaname = 'public' order by tablename
`)

const { rows: policies } = await db.query(`
  select tablename, policyname, cmd, roles::text as roles, qual, with_check
  from pg_policies where schemaname = 'public'
  order by tablename, cmd, policyname
`)

const { rows: grants } = await db.query(`
  select table_name, grantee, privilege_type, column_name
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
  order by table_name, grantee, privilege_type, column_name
`)

/**
 * Justification de chaque politique de LECTURE ANONYME.
 *
 * Toute donnée lisible par `anon` est lisible par le monde entier : la clé
 * anonyme est publique. Chaque ligne ci-dessous doit donc répondre à « la
 * cliente en a-t-elle besoin AVANT de réserver ? ». Si la réponse est non, la
 * politique n'a rien à faire là.
 */
const POURQUOI = {
  avis_publies:
    "A7 : les avis PUBLIÉS d'une pro, sur sa page publique. Un avis est fait pour être lu par " +
    'une cliente qui hésite : le cacher le viderait de son sens. La politique ne laisse sortir ' +
    'que le statut `publie` : ni les avis en attente de modération, ni ceux que la pro a ' +
    "masqués. Aucune donnée personnelle n'y transite : la table ne porte QUE le prénom, et il " +
    "n'existe aucune colonne où un nom complet, une adresse ou un téléphone pourrait se ranger.",
  legal_documents_lecture:
    'G7 : les textes contractuels. Une cliente doit pouvoir LIRE les CGU et le consentement SMS ' +
    "AVANT de cocher, et elle n'a pas de compte : un consentement qu'on ne peut pas lire sans " +
    "s'engager n'est pas un consentement. Ce sont par ailleurs les seules données du produit " +
    'destinées à être publiques par nature : un contrat d’adhésion opposable qu’on garderait ' +
    'secret serait inopposable. Aucune donnée personnelle n’y figure : la table ne contient que ' +
    'des textes, leur version et leur date d’entrée en vigueur. Les PREUVES d’acceptation, elles, ' +
    'sont dans `acceptances`, fermée à `anon` et lisible par chaque pro pour ses seules lignes.',
  pro_photos_publiques:
    'Les réalisations sont des photos de TRAVAUX que la pro choisit de montrer (A1, planche 15a) : ' +
    "une coiffeuse se choisit d'abord sur ce qu'elle sait faire, et une page sans réalisation ne " +
    'vend pas. Restreinte aux fiches `published`. À ne pas confondre avec `appointment_photos` ' +
    '(A4), qui sont les photos des CLIENTES : seau privé, aucune politique, jamais publiques. ' +
    'Les deux ne partagent ni table, ni seau, ni règle.',
  public_profile:
    'La page de réservation est publique par nature (A1) et doit être indexable par Google : ' +
    "c'est le moteur d'acquisition organique du pro (A2). Restreinte aux fiches `published` : " +
    'une fiche en cours de configuration reste invisible. Téléphone et e-mail du pro ne sont ' +
    'pas dans les colonnes exposées.',
  public_services:
    'La cliente doit voir prestations, prix et durées avant de réserver : des tarifs affichés ' +
    "sont une exigence explicite de A1. Restreinte aux prestations actives d'une fiche publiée : " +
    'une prestation masquée disparaît de la page.',
  public_area:
    "La cliente doit savoir si elle est dans la zone d'intervention avant de saisir quoi que ce " +
    'soit, sinon elle remplit un formulaire pour rien (A3, A5, A6).',
  public_area_communes:
    "Même raison : la liste des communes desservies est ce qui permet d'annoncer « je me déplace " +
    'chez vous » ou « vous êtes hors zone » sans faire perdre son temps à la cliente.',
  public_distance_fees:
    "Le supplément kilométrique fait partie du prix annoncé (A8). Le cacher jusqu'au paiement " +
    'serait une mauvaise surprise, et la roadmap exige des tarifs justes sur la page publique.',
  communes_publiques:
    "Référentiel public de l'État (code INSEE, nom, codes postaux, centroïde), importé en base " +
    "par la décision D6 pour ne plus dépendre d'un service tiers à l'exécution. Aucune donnée " +
    'personnelle : ce sont des communes, déjà librement consultables sur geo.api.gouv.fr. La ' +
    'cliente en a besoin AVANT de réserver, pour savoir si elle est desservie, et la pro pour ' +
    "composer sa zone. L'écriture reste au service_role : aucune politique ne l'ouvre.",
  public_booking_settings:
    "Pilote l'affichage des conditions de paiement côté cliente (S1) : mode de paiement, " +
    "pourcentage d'acompte, délai d'annulation, confirmation manuelle. Sans ces quatre " +
    "réglages, la page ne peut pas dire à la cliente ce qu'elle va payer et quand. Les autres " +
    'réglages du pro (SMS, tampons, GPS) ne sont pas exposés.',
}

const cmdFr = (cmd) =>
  ({
    SELECT: 'lire',
    INSERT: 'écrire',
    UPDATE: 'modifier',
    DELETE: 'supprimer',
    ALL: 'lire/écrire/modifier/supprimer',
  })[cmd] ?? cmd

const rolesFr = (roles) =>
  roles
    .replace(/[{}]/g, '')
    .split(',')
    .map(
      (r) =>
        ({ anon: 'visiteuse anonyme', authenticated: 'pro authentifié', public: 'tous' })[
          r.trim()
        ] ?? r.trim(),
    )
    .join(', ')

const lignes = []
for (const { tablename, rowsecurity } of tables) {
  const p = policies.filter((x) => x.tablename === tablename)

  if (!rowsecurity) {
    lignes.push(`| \`${tablename}\` | ⛔ **RLS DÉSACTIVÉE** | aucune |`)
    continue
  }
  if (p.length === 0) {
    lignes.push(
      `| \`${tablename}\` | 🔒 RLS active, **aucune politique** | ` +
        `Verrouillée par conception : écriture via route serveur uniquement (service_role). |`,
    )
    continue
  }

  for (const pol of p) {
    const portee = (pol.qual ?? pol.with_check ?? 'toutes les lignes')
      .replace(/\s+/g, ' ')
      .replace(/\( SELECT auth\.uid\(\) AS uid\)/g, 'auth.uid()')
      .slice(0, 150)
    lignes.push(
      `| \`${tablename}\` | \`${pol.policyname}\` : ${rolesFr(pol.roles)} peut **${cmdFr(pol.cmd)}** ` +
        `| \`${portee}\` |`,
    )
  }
}

// Colonnes explicitement ouvertes à anon : le second filet, au niveau des droits.
const parTable = {}
for (const g of grants) {
  if (g.grantee !== 'anon' || g.privilege_type !== 'SELECT') continue
  ;(parTable[g.table_name] ??= []).push(g.column_name)
}

const colonnes = Object.entries(parTable)
  .map(
    ([t, cols]) =>
      `| \`${t}\` | ${cols
        .sort()
        .map((c) => `\`${c}\``)
        .join(', ')} |`,
  )
  .join('\n')

// Justifications, dans l'ordre où les politiques apparaissent.
const lecturesAnonymes = policies.filter((pol) => pol.roles.includes('anon'))
const justifications = lecturesAnonymes
  .map((pol) => {
    const texte = POURQUOI[pol.policyname] ?? '⚠️ **NON JUSTIFIÉE** : à documenter ou à retirer.'
    return `### \`${pol.policyname}\` · \`${pol.tablename}\`\n\n${texte}`
  })
  .join('\n\n')

const orphelines = lecturesAnonymes.filter((pol) => !POURQUOI[pol.policyname])

const doc = `# Matrice d'accès aux données

> **Fichier généré** par \`npm run db:matrice\` depuis le schéma réel.
> Ne pas le modifier à la main : modifier les migrations, puis régénérer.

Trois rôles interviennent :

- **visiteuse anonyme** (\`anon\`) : la cliente finale sur la page publique. Sa clé est
  publique par nature : tout ce qui lui est ouvert est ouvert au monde entier.
- **pro authentifié** (\`authenticated\`) : un compte connecté. Son identité vient du jeton,
  jamais d'un paramètre.
- **serveur** (\`service_role\`) : les routes serveur. Contourne la RLS, mais **pas** les
  contraintes ni les déclencheurs.

## Politiques, table par table

| Table | Politique | Lignes concernées |
|---|---|---|
${lignes.join('\n')}

## Colonnes lisibles par une visiteuse anonyme

Le filtrage ne repose pas que sur les politiques : les droits sont accordés colonne par
colonne. Une requête qui demande une colonne absente de cette liste est refusée par la
base, quelle qu'en soit la provenance.

| Table | Colonnes exposées |
|---|---|
${colonnes}

## Pourquoi chaque lecture anonyme existe

Ce qui est ouvert à \`anon\` est ouvert au monde entier : la clé anonyme est publique.
Chaque politique de lecture doit donc répondre à une seule question : **la cliente en a-t-elle
besoin avant de réserver ?**

${justifications}

## Ce qui n'est jamais exposé

Aucune politique anonyme ne touche \`evenements\`, \`clients\`, \`client_addresses\`, \`appointments\`,
\`appointment_photos\`, \`subscriptions\`, \`sms_usage\`, \`blocked_slots\`, \`time_off\`,
\`working_hours\`, \`city_waitlist\` ni \`rate_limits\`. Les noms, téléphones, adresses de
domicile et photos des clientes sont des données personnelles : elles ne sortent jamais du
compte de leur pro.
`

writeFileSync(join(racine, 'docs', 'matrice-acces.md'), doc)
console.log(`docs/matrice-acces.md : ${tables.length} tables, ${policies.length} politiques`)

// Une lecture anonyme non justifiée est un oubli, pas un détail de rédaction.
if (orphelines.length > 0) {
  console.error(
    `\nLectures anonymes sans justification : ${orphelines.map((p) => p.policyname).join(', ')}`,
  )
  process.exit(1)
}
