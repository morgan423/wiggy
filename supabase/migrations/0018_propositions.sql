-- 0018 — A11 : la proposition en attente de réponse, généralisée.
-- @sonde: propositions
--
-- La SONDE dit comment savoir, en interrogeant la base, si cette migration est
-- passée : un objet qui n'existe QU'APRÈS elle. `npm run db:etat` la vérifie.
--
-- LE MOTIF DE GÉNÉRALISATION, et il vaut d'être écrit ici. Le patron « sous
-- réserve » existe déjà dans les deux sens : le supplément de zone (A8) fait
-- une proposition que la cliente confirme, et le report (A10) en fera une
-- autre. La contre-proposition d'A11 est la troisième. Trois mécaniques
-- séparées, ce sont trois façons de dire non, trois liens à sécuriser et trois
-- endroits où oublier un cas.
--
-- Une seule table, donc, avec un motif. Ce qui change d'un cas à l'autre est ce
-- qui est proposé ; ce qui ne change jamais est le cycle : une pro propose, une
-- cliente répond, et le rendez-vous ne bouge qu'après sa réponse.
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017. Postgres n'offre pas de
-- « create type if not exists » : on teste `pg_type`, ce qui revient au même et
-- se rejoue sans erreur.
do $types$
begin
  if not exists (select 1 from pg_type where typname = 'proposition_kind') then
    create type proposition_kind as enum ('contre_proposition', 'forfait', 'report');
  end if;
  if not exists (select 1 from pg_type where typname = 'proposition_status') then
    create type proposition_status as enum ('en_attente', 'acceptee', 'refusee', 'caduque');
  end if;
end
$types$;

create table if not exists propositions (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  pro_id         uuid not null references pros (id) on delete cascade,
  kind           proposition_kind not null,
  status         proposition_status not null default 'en_attente',

  -- Ce qui est proposé. Tout est nullable : une contre-proposition peut ne
  -- toucher que le prix, un forfait ne touche que le montant.
  service_id     uuid references services (id) on delete set null,
  service_name   text,
  price_cents    integer check (price_cents is null or price_cents >= 0),
  duration_min   integer check (duration_min is null or duration_min > 0),
  starts_at      timestamptz,
  -- Le mot de la pro. C'est lui qui fait accepter : « vos photos montrent des
  -- longueurs, je prévois trente minutes de plus ».
  message        text,

  -- Le lien sans compte. Même patron que `appointments.public_token` : la
  -- cliente n'a pas de compte et n'en aura pas.
  public_token   uuid not null default gen_random_uuid() unique,

  created_at     timestamptz not null default now(),
  responded_at   timestamptz
);

create index if not exists propositions_rdv_idx on propositions (appointment_id, created_at desc);

comment on table propositions is
  'A11, A8, A10 : une proposition de la pro en attente de reponse de la '
  'cliente. Un seul motif pour les trois cas : le rendez-vous ne bouge '
  'qu''apres la reponse.';

alter table propositions enable row level security;

-- La pro voit et crée les siennes. La cliente, elle, passe par une route
-- serveur avec son jeton : aucune politique anonyme ici, comme pour le suivi
-- d'un rendez-vous. Un jeton dans une URL n'est pas une authentification, et il
-- ne doit jamais ouvrir une table entière.
drop policy if exists propositions_self on propositions;
create policy propositions_self on propositions
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

revoke all on propositions from anon;
