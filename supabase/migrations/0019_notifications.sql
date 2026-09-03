-- 0019 — B14 : le centre de notifications, et les bascules qui vont avec.
--
-- ⚠️ LA DISTINCTION À NE PAS BROUILLER, et elle décide de tout le reste :
--
--   · le bloc « À décider » de l'agenda est LA FILE D'ACTION. La pro y va pour
--     AGIR, et ce qui s'y trouve attend une décision d'elle ;
--   · la cloche est LE JOURNAL. Elle y va pour SAVOIR ce qui s'est passé
--     pendant qu'elle coiffait.
--
-- Deux besoins, deux endroits. Cette table est le journal : elle ne porte
-- jamais l'état d'une décision, seulement la trace d'un événement. Le jour où
-- l'on serait tenté d'y mettre un « à traiter », c'est qu'on est en train de
-- refaire la file d'action une seconde fois.
create type notification_kind as enum (
  'reponse_proposition',
  'annulation',
  'acompte_recu',
  'avis_recu',
  'demande_traitee'
);

create table notifications (
  id             uuid primary key default gen_random_uuid(),
  pro_id         uuid not null references pros (id) on delete cascade,
  kind           notification_kind not null,
  -- Ce que la cloche affiche. Le texte est composé à l'écriture et non à la
  -- lecture : un événement dit ce qui s'est passé À CE MOMENT-LÀ, et le
  -- recomposer plus tard le ferait mentir si la donnée a changé depuis.
  titre          text not null,
  detail         text,
  -- Où mène la ligne. Chemin interne, jamais une URL complète.
  lien           text,
  lu_le          timestamptz,
  created_at     timestamptz not null default now()
);

create index notifications_pro_idx on notifications (pro_id, created_at desc);

comment on table notifications is
  'B14 : le JOURNAL de ce qui s''est passe. Jamais une file d''action : celle '
  'du bloc « A decider » de l''agenda reste seule a porter des decisions.';

alter table notifications enable row level security;

create policy notifications_self on notifications
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

revoke all on notifications from anon;

-- ── Les bascules push, dans Profil (D17) ──────────────────────────────────
--
-- Réponse d'une cliente : OUI par défaut, c'est une attente. Une pro qui a
-- contre-proposé attend la réponse, et ne doit pas avoir à ouvrir l'app pour
-- la découvrir.
--
-- Avis reçu : AU CHOIX. Un avis n'appelle aucune action, et le recevoir en
-- pleine prestation n'apporte rien.
alter table pro_settings
  add column push_reponse_cliente boolean not null default true,
  add column push_avis            boolean not null default false;
