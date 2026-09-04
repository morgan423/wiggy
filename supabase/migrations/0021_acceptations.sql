-- 0021 — G7 : l'acceptation contractuelle tracée.
-- @sonde: legal_documents.version
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- LA CONTRAINTE QUI DÉCIDE DE TOUTE LA FORME : « les textes définitifs
-- arriveront d'un avocat au jalon J2 et devront se brancher SANS TOUCHER AU
-- CODE ». Un texte juridique dans un fichier `.tsx`, dans le copy deck ou dans
-- une constante, c'est un déploiement à chaque virgule d'avocat. Les documents
-- vivent donc EN BASE, et l'application n'en connaît que les identifiants.
--
-- LE VERSIONNAGE N'EST PAS UN CHAMP, C'EST LA CLÉ. `(slug, version)` est la clé
-- primaire : une nouvelle version est une LIGNE DE PLUS, jamais une mise à jour
-- de l'ancienne. Une acceptation passée pointe donc pour toujours sur le texte
-- exact qui a été montré ce jour-là, et il devient impossible de réécrire
-- l'histoire — même en le voulant, même par erreur.

-- ── Les documents ─────────────────────────────────────────────────────────
create table if not exists legal_documents (
  slug          text not null,
  -- Version DATÉE : c'est elle qui est opposable, pas le contenu.
  version       text not null,
  -- Le jour où cette version entre en vigueur. La version « courante » est la
  -- plus récente dont la date est passée : cela permet de PRÉPARER une version
  -- à l'avance (le préavis de 30 jours des CGV) sans qu'elle s'applique avant
  -- l'heure, et sans tâche planifiée pour la basculer.
  effective_on  date not null,
  titre         text not null,
  -- Le texte, en Markdown. C'est ce que l'avocat livrera, et c'est tout ce
  -- qu'il faudra insérer.
  corps         text not null,
  created_at    timestamptz not null default now(),
  primary key (slug, version)
);

create index if not exists legal_documents_courant_idx
  on legal_documents (slug, effective_on desc);

comment on table legal_documents is
  'G7 : les textes contractuels, versionnes. Une nouvelle version est une '
  'LIGNE DE PLUS. Jamais d''update sur une version deja acceptee : cela '
  'reecrirait le contenu d''un accord passe.';

-- ── Les acceptations ──────────────────────────────────────────────────────
do $types$
begin
  if not exists (select 1 from pg_type where typname = 'acceptance_point') then
    create type acceptance_point as enum (
      'inscription_pro',
      'reservation_cliente',
      'activation_paiement',
      'activation_parrainage'
    );
  end if;
end
$types$;

create table if not exists acceptances (
  id           uuid primary key default gen_random_uuid(),
  point        acceptance_point not null,
  -- QUI a accepté. Un pro est un compte d'authentification ; une cliente n'en
  -- a pas, elle est identifiée par sa fiche. Exactement l'un des deux.
  --
  -- La référence du pro va vers `auth.users` et non vers `pros` : à
  -- l'inscription, le compte existe mais la fiche pro n'est créée qu'au premier
  -- accès authentifié. Pointer sur `pros` rendrait l'acceptation la plus
  -- importante du produit, celle des CGV, impossible à enregistrer au moment
  -- même où elle est donnée.
  user_id      uuid references auth.users (id) on delete cascade,
  client_id    uuid references clients (id) on delete cascade,
  -- Le document ACCEPTÉ, dans sa version exacte. La clé étrangère composite
  -- interdit de supprimer une version tant qu'une acceptation la vise : la
  -- preuve reste lisible, ou elle n'est pas une preuve.
  doc_slug     text not null,
  doc_version  text not null,
  -- L'HORODATAGE SERVEUR. Jamais l'horloge du client : voir le déclencheur
  -- plus bas, qui l'impose au lieu de l'espérer.
  accepted_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  foreign key (doc_slug, doc_version) references legal_documents (slug, version),
  constraint acceptances_un_seul_sujet check (
    (user_id is not null and client_id is null)
    or (user_id is null and client_id is not null)
  )
);

create index if not exists acceptances_user_idx   on acceptances (user_id, doc_slug);
create index if not exists acceptances_client_idx on acceptances (client_id, doc_slug);

comment on table acceptances is
  'G7 : le quadruple de preuve. Compte, document AVEC SA VERSION, horodatage '
  'SERVEUR, evenement (colonne point).';

/*
  L'HORODATAGE SERVEUR, PAR CONSTRUCTION.

  Un `default now()` ne suffit pas : il ne s'applique que si personne n'envoie
  la colonne. Le jour où un appel enverrait `accepted_at`, la valeur passerait
  sans un bruit, et c'est l'horloge d'un navigateur qui daterait une preuve
  contractuelle. Le déclencheur ÉCRASE ce qui arrive. Il n'y a donc aucun
  chemin, même fautif, par lequel un client peut dater sa propre acceptation.

  C'est la même discipline que `db:etat` en lecture seule : vrai par
  construction et non par discipline (R2-4).
*/
create or replace function acceptance_horodatage_serveur()
returns trigger
language plpgsql
as $fn$
begin
  new.accepted_at := now();
  new.created_at := now();
  return new;
end
$fn$;

drop trigger if exists acceptances_horodatage on acceptances;
create trigger acceptances_horodatage
  before insert on acceptances
  for each row execute function acceptance_horodatage_serveur();

/*
  UNE PREUVE NE SE MODIFIE NI NE S'EFFACE.

  Une acceptation est un fait daté. La corriger n'aurait aucun sens, et POUVOIR
  la corriger retirerait sa valeur à toutes celles qu'on n'a pas corrigées :
  une preuve modifiable ne prouve rien.

  ⚠️ L'absence de politique `update` ne suffit PAS, et c'est le piège. Sans
  politique, la RLS ne refuse pas la commande : elle la fait porter sur zéro
  ligne. L'appel « réussit » en silence, ce qui est le pire des deux mondes —
  on croit avoir corrigé, rien n'a bougé, et rien ne l'a dit. Et la RLS ne
  s'applique de toute façon pas au `service_role`, qui est précisément le rôle
  par lequel nous écrivons.

  Le déclencheur, lui, LÈVE. Pour tout le monde, service_role compris. C'est la
  même discipline que l'horodatage : vrai par construction, pas par discipline.
*/
create or replace function acceptance_immuable()
returns trigger
language plpgsql
as $fn$
begin
  raise exception 'Une acceptation est une preuve : elle ne se modifie ni ne s''efface (G7).';
end
$fn$;

drop trigger if exists acceptances_immuables on acceptances;
create trigger acceptances_immuables
  before update or delete on acceptances
  for each row execute function acceptance_immuable();

alter table acceptances enable row level security;
alter table legal_documents enable row level security;

-- Les documents sont PUBLICS en lecture : une cliente doit pouvoir lire les
-- CGU avant d'accepter, sans compte.
drop policy if exists legal_documents_lecture on legal_documents;
create policy legal_documents_lecture on legal_documents
  for select to anon, authenticated
  using (true);

-- Un pro relit ses propres acceptations, et rien d'autre.
drop policy if exists acceptances_les_miennes on acceptances;
create policy acceptances_les_miennes on acceptances
  for select to authenticated
  using (user_id = auth.uid());

-- Les droits, explicites : sur Supabase le rôle connecté reçoit tout par
-- défaut, `anon` ne reçoit que ce qu'on lui donne. On donne le strict
-- nécessaire, et on reprend le reste.
grant select on legal_documents to anon, authenticated;
revoke all on acceptances from anon;
revoke insert, update, delete on legal_documents from anon, authenticated;
revoke update, delete on acceptances from anon, authenticated;

/*
  LES TEXTES DE BÊTA.

  Provisoires, et ils le DISENT dans leur propre corps : un texte provisoire qui
  ne s'annonce pas est un texte qu'on oublie de remplacer. La version porte le
  mot « beta » pour la même raison.

  Le jour J2, l'avocat livre ses textes : on insère quatre lignes de plus, avec
  une version et une date d'entrée en vigueur. AUCUN code ne change, et les
  acceptations de la bêta restent attachées à ce qu'elles ont réellement
  accepté.

  `on conflict do nothing` : rejouable, et surtout, ne réécrit JAMAIS un texte
  déjà accepté.
*/
insert into legal_documents (slug, version, effective_on, titre, corps) values
  ('cgv', '0.1-beta', date '2026-01-01', 'Conditions générales de vente',
   E'**Version provisoire de bêta.** Ce texte sera remplacé par les conditions '
   'définitives rédigées par un avocat avant l''ouverture commerciale. Il est '
   'publié pour que la mécanique d''acceptation soit en place et tracée dès le '
   'premier compte.\n\nWiggy est un service de prise de rendez-vous pour '
   'professionnels de la coiffure à domicile. L''abonnement est mensuel et '
   'résiliable à tout moment.'),
  ('confidentialite', '0.1-beta', date '2026-01-01', 'Politique de confidentialité',
   E'**Version provisoire de bêta.** Ce texte sera remplacé par la politique '
   'définitive avant l''ouverture commerciale.\n\nLes données de tes clientes '
   't''appartiennent. Wiggy ne les revend pas et ne les exploite pas à des fins '
   'publicitaires. Aucune donnée de santé n''est collectée. La position '
   'ponctuelle utilisée pour calculer un trajet n''est jamais conservée.'),
  ('cgu', '0.1-beta', date '2026-01-01', 'Conditions générales d''utilisation',
   E'**Version provisoire de bêta.** Ce texte sera remplacé par les conditions '
   'définitives avant l''ouverture commerciale.\n\nEn réservant, vous demandez '
   'un rendez-vous à une professionnelle indépendante. Wiggy met en relation et '
   'n''exécute pas la prestation.'),
  ('sms', '0.1-beta', date '2026-01-01', 'Consentement aux SMS',
   E'**Version provisoire de bêta.**\n\nVous acceptez de recevoir par SMS la '
   'confirmation de votre rendez-vous et un rappel avant celui-ci. Aucun SMS '
   'publicitaire ne vous sera envoyé.'),
  ('parrainage', '0.1-beta', date '2026-01-01', 'Conditions du parrainage',
   E'**Version provisoire de bêta.** Les conditions du programme Ambassadrices '
   'seront précisées avant son ouverture.')
on conflict (slug, version) do nothing;
