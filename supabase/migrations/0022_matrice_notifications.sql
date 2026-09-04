-- 0022 — B14 : la matrice des notifications, événement par canal.
-- @sonde: pro_settings.badge_nouveau_rdv
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- LES DEUX BASCULES DE 0019 NE SUFFISAIENT PAS. `push_reponse_cliente` et
-- `push_avis` couvraient deux événements sur six, et surtout un seul canal.
--
-- TROIS NIVEAUX, ET UN SEUL N'EST PAS RÉGLABLE :
--   ① le JOURNAL reçoit tout, toujours. Aucune colonne ne le coupe, et c'est
--      délibéré : un registre qu'on peut couper crée des trous invisibles, et
--      la pro ne sait pas ce qu'elle ne voit pas ;
--   ② le BADGE de la cloche, réglable : ce qui attire l'œil DANS l'app ;
--   ③ le PUSH, réglable : ce qui interrompt DANS LA POCHE.
--
-- LES DÉFAUTS SUIVENT LA RÈGLE tranchée le 04/09 : le push est actif quand
-- l'événement CHANGE L'AGENDA ou ATTEND UNE ACTION, inactif quand il est
-- seulement AGRÉABLE À SAVOIR. Un avis à cinq étoiles fait plaisir, il
-- n'appelle rien, il n'a pas à interrompre une prestation.
--
-- `push_reponse_cliente` et `push_avis` existent depuis 0019 avec exactement
-- les bonnes valeurs par défaut : elles ne sont pas recréées, elles entrent
-- dans la matrice telles quelles. Une migration appliquée ne se réécrit jamais.

alter table pro_settings
  -- ② Le badge : actif partout par défaut. Même ce qui n'interrompt pas mérite
  -- d'être vu quand la pro ouvre son app de son plein gré.
  add column if not exists badge_nouveau_rdv       boolean not null default true,
  add column if not exists badge_demande_a_valider boolean not null default true,
  add column if not exists badge_reponse_cliente   boolean not null default true,
  add column if not exists badge_annulation        boolean not null default true,
  add column if not exists badge_avis              boolean not null default true,
  add column if not exists badge_acompte           boolean not null default true,
  -- ③ Le push, selon la règle.
  add column if not exists push_nouveau_rdv        boolean not null default true,
  add column if not exists push_demande_a_valider  boolean not null default true,
  add column if not exists push_annulation         boolean not null default true,
  add column if not exists push_acompte            boolean not null default false;

comment on column pro_settings.push_avis is
  'Agreable a savoir : n''interrompt pas. Regle du 04/09.';
comment on column pro_settings.push_acompte is
  'Agreable a savoir : n''interrompt pas. Regle du 04/09.';

-- Les deux événements que le journal peut déjà produire mais que l'énumération
-- ne nommait pas. `demande_traitee` existe depuis 0019 et couvre la demande
-- tranchée (A6, A11) ; il manquait le rendez-vous NÉ et la demande ARRIVÉE.
do $enum$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'notification_kind' and e.enumlabel = 'nouveau_rdv') then
    alter type notification_kind add value 'nouveau_rdv';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'notification_kind' and e.enumlabel = 'demande_a_valider') then
    alter type notification_kind add value 'demande_a_valider';
  end if;
end
$enum$;
