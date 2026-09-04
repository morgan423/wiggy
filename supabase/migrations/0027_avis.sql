-- 0027 — A7 : le système d'avis.
-- @sonde: avis
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- POURQUOI MAINTENANT, alors qu'A7 n'était pas un prérequis de bêta : la home
-- porte une section « Elles l'utilisent en vrai », aujourd'hui remplie de faux
-- témoignages de composition qu'une garde empêche d'atteindre la production. Le
-- plan est de les remplacer par les avis réels des bêta-testeuses. **Si la
-- collecte n'existe pas PENDANT la bêta, on n'aura aucun avis au lancement**, et
-- la section restera fausse ou vide.
--
-- ⚠️ UN AVIS EST AFFICHÉ PUBLIQUEMENT. Il ne porte donc QUE le prénom, jamais le
-- nom complet, jamais l'adresse, jamais le téléphone. C'est le principe
-- fondateur du produit, et il est tenu ici par le SCHÉMA : la table ne contient
-- aucune colonne où un nom complet pourrait se ranger.

do $types$
begin
  if not exists (select 1 from pg_type where typname = 'avis_statut') then
    create type avis_statut as enum (
      -- Déposé par la cliente, pas encore vu par la pro.
      'en_attente',
      -- La pro l'a publié : il devient visible sur sa page.
      'publie',
      -- La pro l'a masqué. On ne le SUPPRIME pas : masquer et effacer sont deux
      -- gestes différents, et l'un se regrette moins que l'autre.
      'masque'
    );
  end if;
end
$types$;

create table if not exists avis (
  id            uuid primary key default gen_random_uuid(),
  pro_id        uuid not null references pros (id) on delete cascade,
  -- Le rendez-vous qui a donné lieu à l'avis. Unique : une prestation, un avis.
  appointment_id uuid not null unique references appointments (id) on delete cascade,
  -- ⚠️ LE PRÉNOM SEUL. Il n'existe pas de colonne « nom » dans cette table, et
  -- c'est délibéré : ce qui n'a pas de place ne peut pas être rempli par erreur.
  prenom        text not null check (length(prenom) between 1 and 40),
  note          smallint not null check (note between 1 and 5),
  -- Le texte est facultatif : une note sans commentaire reste un avis.
  texte         text check (length(texte) <= 600),
  statut        avis_statut not null default 'en_attente',
  created_at    timestamptz not null default now(),
  publie_le     timestamptz
);

create index if not exists avis_pro_idx on avis (pro_id, statut, created_at desc);

comment on table avis is
  'A7 : les avis. PRENOM SEUL, jamais de nom complet ni d''adresse : ils sont '
  'affiches publiquement. La table n''a pas de colonne ou un nom complet '
  'pourrait se ranger.';

/*
  LE JETON DE DÉPÔT vit sur le rendez-vous, pas ici.

  `appointments.public_token` existe déjà et sert la page de suivi sans compte.
  En créer un second pour l'avis donnerait deux liens à la même cliente pour le
  même rendez-vous, et deux occasions de se tromper. La page de suivi porte le
  formulaire d'avis quand le rendez-vous est terminé.
*/

alter table avis enable row level security;

-- La cliente dépose SANS COMPTE, par la route serveur : aucune politique
-- d'écriture ici, comme pour le reste des écritures clientes.
--
-- La pro lit et modère les siens.
drop policy if exists avis_du_pro on avis;
create policy avis_du_pro on avis
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

-- Les avis PUBLIÉS sont lisibles par tous, et seulement ceux-là : c'est ce qui
-- fait d'eux un affichage public. Un avis en attente ou masqué ne sort jamais.
drop policy if exists avis_publies on avis;
create policy avis_publies on avis
  for select to anon
  using (statut = 'publie');

revoke insert, update, delete on avis from anon;
grant select on avis to anon;
