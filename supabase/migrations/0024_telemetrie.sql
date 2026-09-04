-- 0024 — E3 : la télémétrie de bêta.
-- @sonde: evenements
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- AUCUN OUTIL TIERS, aucun script externe, aucun pixel. La donnée d'usage de
-- nos pros et de leurs clientes ne sort pas de notre base : c'est la même règle
-- que pour le reste du produit, et elle vaut aussi quand la donnée nous
-- arrangerait.
--
-- ⚠️ LES ÉVÉNEMENTS SONT LIMITÉS AUX HUIT QUESTIONS QU'ON SE POSE, et à aucune
-- autre. Une table de télémétrie s'élargit toute seule si on la laisse faire :
-- l'énumération ci-dessous est la barrière, et elle est dans le SCHÉMA, pas
-- dans une convention. Une neuvième question suppose une migration, donc une
-- décision.

do $types$
begin
  if not exists (select 1 from pg_type where typname = 'evenement_kind') then
    create type evenement_kind as enum (
      -- ① Calibre le score de A12 : quel étage, quel rang, quel coût marginal.
      'creneau_choisi',
      -- ② Décide de D2 (synchronisation Google) : le blocage manuel sert-il ?
      'blocage_manuel',
      -- ③ L'entonnoir de réservation, dont l'abandon à l'étape adresse.
      'tunnel_etape',
      -- ④ Ratio des réservations en ligne contre les saisies manuelles.
      'rdv_cree',
      -- ⑤ L'objectif des 48 heures de G3.
      'premiere_reservation',
      -- ⑥ Fréquence et issue des contre-propositions (A11).
      'contre_proposition',
      -- ⑦ Volume SMS mensuel : valide le plafond de 300 et le coût de B7.
      'sms_envoye',
      -- ⑧ Consultation de la tournée, installation PWA, usage hors-ligne (C9).
      'usage_app'
    );
  end if;
end
$types$;

create table if not exists evenements (
  id          bigint generated always as identity primary key,
  kind        evenement_kind not null,
  -- QUI, et la distinction est tout le cadrage RGPD de cette table.
  --
  -- `pro_id` : événement PRO, rattaché au compte. Finalité « amélioration du
  -- service », inscrite dans la politique de confidentialité.
  --
  -- `session` : événement CLIENTE FINALE. Identifiant de session ÉPHÉMÈRE et
  -- RIEN D'AUTRE. Jamais d'identité, jamais de téléphone, jamais d'adresse,
  -- jamais de coordonnées. Il ne permet de relier entre elles que les étapes
  -- d'une même visite, ce qui est exactement ce que l'entonnoir demande, et
  -- rien de plus.
  pro_id      uuid references pros (id) on delete cascade,
  session     text,
  -- Le détail, en clair et en petit. Voir le commentaire de contrainte.
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  -- Un événement vise un pro OU une session, jamais les deux : les mélanger
  -- rendrait une visite anonyme rattachable à un compte.
  constraint evenements_un_seul_sujet check (
    (pro_id is not null and session is null) or (pro_id is null and session is not null)
  )
);

create index if not exists evenements_kind_idx on evenements (kind, created_at desc);
create index if not exists evenements_pro_idx on evenements (pro_id, created_at desc);

comment on table evenements is
  'E3 : telemetrie de beta. AUCUNE donnee personnelle, jamais. Les evenements '
  'cliente portent un identifiant de session EPHEMERE et rien d''autre.';
comment on column evenements.details is
  'Mesures uniquement : des nombres, des rangs, des enumerations. Jamais un '
  'nom, un telephone, une adresse, des coordonnees, ni le genre de qui que ce '
  'soit. Le helper applicatif est le seul point d''ecriture et filtre ce qu''il '
  'accepte.';

/*
  VERROUILLÉE PAR CONCEPTION, comme `city_waitlist` et `rate_limits`.

  RLS active et AUCUNE politique : toute écriture passe par la route serveur en
  `service_role`, qui porte le helper unique. Ouvrir un `insert` à `anon`
  rendrait la table écrivable directement via PostgREST avec la clé anonyme, qui
  est publique : n'importe qui pourrait la remplir, et une mesure qu'on peut
  fabriquer ne mesure plus rien.
*/
alter table evenements enable row level security;
revoke all on evenements from anon, authenticated;

/*
  PURGE À DOUZE MOIS.

  La fonction existe même si rien ne la déclenche encore : écrite au moment où
  la table naît, elle ne sera pas à réinventer le jour où douze mois seront
  passés — et ce jour-là, personne ne se souviendra du délai retenu.

  Comment on la planifiera, au choix et à trancher avant la fin de la bêta :
  soit `pg_cron` sur le projet Supabase (`select cron.schedule('purge-evenements',
  '0 4 1 * *', 'select purger_evenements()')`), soit un appel depuis la vue de
  synthèse hebdomadaire, sur le modèle du journal des notifications qui se purge
  à la lecture. La seconde voie se répare d'elle-même : une tâche planifiée qui
  ne tourne plus laisse grossir la table sans que personne le voie.
*/
create or replace function purger_evenements()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  supprimes integer;
begin
  delete from evenements where created_at < now() - interval '12 months';
  get diagnostics supprimes = row_count;
  return supprimes;
end
$fn$;

revoke all on function purger_evenements() from anon, authenticated;

/*
  LA VUE DE SYNTHÈSE HEBDOMADAIRE, embryon du back office F3.

  ⚠️ RAPPEL DE LECTURE, et il compte autant que les chiffres : à CINQ
  testeuses, ces données éclairent des COMPORTEMENTS INDIVIDUELS, elles ne
  prouvent AUCUNE tendance. L'observation directe et les débriefs restent
  l'instrument principal. La télémétrie dit CE QUI S'EST PASSÉ, pas POURQUOI.

  Agrégée par semaine et par pro : on ne regarde jamais un événement isolé, et
  la vue ne donne d'ailleurs pas les moyens de le faire.
*/
create or replace view synthese_hebdo as
select
  date_trunc('week', created_at)::date as semaine,
  pro_id,
  kind,
  count(*) as volume
from evenements
where pro_id is not null
group by 1, 2, 3;

revoke all on synthese_hebdo from anon, authenticated;
