-- D6 : le référentiel des communes descend en base.
--
-- Jusqu'ici, composer sa zone d'intervention interrogeait l'API de l'État à
-- chaque frappe. Un hoquet de cinq secondes sur ce service laissait la pro sans
-- aucun moyen de renseigner sa zone, alors que A3, A5, A6 et A8 en dépendent
-- tous (recette du 31/08, bloquant B2).
--
-- Une saisie manuelle libre en repli était exclue : la décision T13 fait
-- reposer l'appartenance à la zone sur le code INSEE, et une commune saisie à
-- la main sans code INSEE casserait le moteur géo au lieu de le sauver.
--
-- La liste des communes est statique, quelques dizaines de changements par an :
-- en dépendre à l'exécution était le mauvais couplage dès le départ. L'API
-- devient la source d'un import périodique, plus jamais une dépendance de
-- fonctionnement.
--
-- Cette migration crée la table VIDE. C'est `npm run communes:import` qui
-- l'alimente en service_role : on ne colle pas trente mille insertions dans
-- l'éditeur SQL.

create table communes (
  insee_code   text primary key,
  name         text not null,
  -- Une commune peut en porter plusieurs (Saint-Paul en compte six).
  postal_codes text[] not null default '{}',
  -- Centroïde : sert aux communes limitrophes proposées à la composition de
  -- la zone, et au repère « à 23 km de Pau » sur une demande hors zone.
  lat          double precision,
  lng          double precision,
  -- Classe les homonymes par importance : « Saint-Paul » doit proposer la
  -- grande avant les six autres.
  population   integer not null default 0,
  -- Clé de recherche : nom sans accent, sans tiret, sans casse. Calculée par
  -- l'import, jamais saisie. Évite d'exiger l'extension `unaccent`.
  search_key   text not null,
  updated_at   timestamptz not null default now()
);

-- Recherche par préfixe : `search_key like 'pau%'`. `text_pattern_ops` est ce
-- qui rend cet index utilisable par `like`, l'index par défaut ne l'est pas.
create index communes_recherche on communes (search_key text_pattern_ops);
create index communes_population on communes (population desc);

alter table communes enable row level security;

-- Lecture publique assumée : la composition de la zone se fait sur un écran
-- pro, mais la page de réservation en a besoin elle aussi pour dire à la
-- cliente si elle est desservie, avant qu'elle saisisse quoi que ce soit.
-- C'est un référentiel public de l'État, il ne contient aucune donnée
-- personnelle et il est déjà librement consultable sur geo.api.gouv.fr.
grant select on communes to anon, authenticated;

create policy communes_publiques on communes
  for select to anon, authenticated
  using (true);

-- L'écriture reste au service_role : c'est l'import qui alimente, jamais un
-- compte. Aucune politique d'écriture, donc aucune écriture possible autrement.

-- Date de la source, pour savoir quand l'import a été rafraîchi la dernière fois.
create table communes_import (
  id           boolean primary key default true check (id),
  importe_le   timestamptz not null default now(),
  lignes       integer not null default 0
);
alter table communes_import enable row level security;
-- Verrouillée par conception : lue et écrite par l'import, en service_role.
