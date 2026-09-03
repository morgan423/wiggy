-- 0020 — B2 : la mémoire technique devient un JOURNAL, pas un champ.
-- @sonde: client_notes
--
-- La SONDE dit comment savoir, en interrogeant la base, si cette migration est
-- passée : un objet qui n'existe QU'APRÈS elle. `npm run db:etat` la vérifie.
--
-- LE DÉFAUT CORRIGÉ, et il touchait la promesse centrale du produit :
-- `clients.technical_notes` est un champ texte unique, et chaque écriture
-- écrasait la précédente. La formule de Noël d'il y a trois ans était perdue
-- dès la visite suivante. On faisait moins bien que le carnet papier qu'on
-- prétend remplacer : un carnet garde toutes ses pages, et elles sont datées.
--
-- TROIS NIVEAUX, à ne pas confondre :
--   ① le PROFIL TECHNIQUE, vrai en permanence (sensibilités, préférences, ce
--      qu'elle n'aime pas). Il reste sur `clients.technical_notes`, éditable et
--      non daté : c'est bien ce que porte ce champ.
--   ② le JOURNAL TECHNIQUE, ce qui a été FAIT à chaque visite (formule,
--      dosage, temps de pose, produits). DATÉ, rattaché au rendez-vous, JAMAIS
--      écrasé. C'est cette table, et c'est ce qui manquait.
--   ③ la NOTE DU RENDEZ-VOUS (B3), les circonstances du jour, sur
--      `appointments.note`. Elle ne change pas.
--
-- LIEN AVEC G6, qui confirme le modèle : l'import du carnet par photo prévoit
-- qu'une page devienne une fiche. Avec un champ unique, vingt pages
-- produiraient une note et dix-neuf pertes. Avec un journal daté, chaque page
-- devient une entrée à sa date. `appointment_id` est donc nullable : une page
-- de carnet importée n'a pas de rendez-vous dans Wiggy, elle a une date.
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
create table if not exists client_notes (
  id             uuid primary key default gen_random_uuid(),
  pro_id         uuid not null references pros (id) on delete cascade,
  client_id      uuid not null references clients (id) on delete cascade,
  appointment_id uuid references appointments (id) on delete set null,
  -- La date de la PRESTATION, pas celle de la saisie. Une pro qui clôture le
  -- soir a fait le travail dans la journée, et une page de carnet importée
  -- porte sa date d'origine.
  fait_le        date not null default (now() at time zone 'Europe/Paris'),
  contenu        text not null,
  created_at     timestamptz not null default now()
);

create index if not exists client_notes_cliente_idx on client_notes (client_id, fait_le desc);

comment on table client_notes is
  'B2 : le JOURNAL technique, une entree datee par visite. Jamais ecrase : '
  'c''est le carnet, page apres page. Le profil technique permanent reste sur '
  'clients.technical_notes.';

comment on column clients.technical_notes is
  'B2 niveau 1 : le PROFIL technique, vrai en permanence (sensibilites, '
  'preferences). Non date, editable. Ce qui a ete FAIT a chaque visite vit '
  'dans client_notes.';

alter table client_notes enable row level security;

drop policy if exists client_notes_self on client_notes;
create policy client_notes_self on client_notes
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

revoke all on client_notes from anon;

-- ⚠️ L'EXISTANT N'EST PAS MIGRÉ, et c'est délibéré.
--
-- Les `technical_notes` déjà saisies n'ont pas de date : personne ne sait de
-- quelle visite elles viennent. En faire une entrée de journal obligerait à
-- leur inventer un jour, et une date fausse dans un carnet est pire qu'une
-- note non datée. Elles restent donc là où elles sont et deviennent le profil
-- technique, ce qu'elles sont déjà en pratique : un texte permanent que la pro
-- relit avant chaque visite.
