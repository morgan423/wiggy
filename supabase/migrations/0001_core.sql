-- Wiggy — schéma fondamental
-- Couvre : B11 (paramétrage activité), B1/B2/B3 (fiches clientes), B4 (blocage),
-- B10 (agenda + RDV manuels), G1 (abonnement & paliers), A4 (photos), A11 (confirmation manuelle).
-- Principe : un pro n'accède qu'à ses propres données (RLS en 0002).

-- gen_random_uuid() est dans le coeur de Postgres depuis la 13 : pas
-- d'extension à installer (Supabase tourne en 15+).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- Paliers §2 de la roadmap. Codes neutres : les noms commerciaux ne sont pas tranchés.
create type tier as enum ('tier_1', 'tier_2', 'tier_3');

create type subscription_status as enum (
  'trialing',   -- essai 30 j avec CB
  'active',
  'past_due',   -- dunning en cours
  'canceled'
);

-- B9 — trois modes au choix du pro. Pilote l'affichage côté cliente (S1).
create type payment_mode as enum (
  'off',            -- « Paiement sur place »
  'client_choice',  -- la cliente choisit à la réservation
  'required'        -- le paiement conditionne la réservation
);

-- A11 — le pro choisit si les résas en ligne arrivent confirmées ou à valider.
create type booking_confirmation_mode as enum ('auto', 'manual');

create type appointment_status as enum (
  'pending',      -- A11 : demande à confirmer par le pro
  'conditional',  -- A6 : hors-zone, sous réserve de validation
  'confirmed',
  'in_progress',
  'done',         -- B6 : clôturé
  'cancelled'
);

create type appointment_source as enum ('online', 'manual');

-- B11 ② méthode de zone. Les deux sont modélisées : l'arbitrage UX reste ouvert
-- (cf. question posée à Morgan), le schéma ne le préempte pas.
create type service_area_mode as enum ('communes', 'radius');

-- ---------------------------------------------------------------------------
-- Compte pro & vitrine (A1)
-- ---------------------------------------------------------------------------

create table pros (
  id            uuid primary key references auth.users (id) on delete cascade,
  slug          text unique not null check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  display_name  text not null,
  headline      text,
  bio           text,
  city          text,
  photo_url     text,
  instagram_url text,
  phone         text,
  years_experience smallint check (years_experience between 0 and 70),
  -- La page publique n'est exposée que si le pro l'a publiée : pas de fiche
  -- fantôme indexée avant que le pro ait rempli quoi que ce soit.
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- B11 ① Prestations
-- ---------------------------------------------------------------------------

create table services (
  id             uuid primary key default gen_random_uuid(),
  pro_id         uuid not null references pros (id) on delete cascade,
  name           text not null,
  description    text,
  price_cents    integer not null check (price_cents >= 0),
  duration_min   smallint not null check (duration_min between 5 and 600),
  -- B9 : le montant collecté se règle par prestation (30 % sur les grosses
  -- prestations, total sur les mariages). null = on suit le réglage global.
  deposit_percent smallint check (deposit_percent between 1 and 100),
  active         boolean not null default true,
  position       smallint not null default 0,
  created_at     timestamptz not null default now()
);
create index on services (pro_id) where active;

-- ---------------------------------------------------------------------------
-- B11 ② Zone d'intervention — la donnée dont dépendent A3, A5, A6, A8
-- ---------------------------------------------------------------------------

create table service_areas (
  pro_id      uuid primary key references pros (id) on delete cascade,
  mode        service_area_mode not null default 'communes',
  -- mode = 'radius'
  center_lat  double precision,
  center_lng  double precision,
  radius_km   smallint check (radius_km between 1 and 150),
  constraint radius_complete check (
    mode <> 'radius' or (center_lat is not null and center_lng is not null and radius_km is not null)
  )
);

-- mode = 'communes' (le terrain pratique « 2-3 communes max »)
create table service_area_communes (
  pro_id      uuid not null references pros (id) on delete cascade,
  insee_code  text not null,
  name        text not null,
  postal_code text,
  lat         double precision,
  lng         double precision,
  primary key (pro_id, insee_code)
);

-- A8 — forfait distance / zones tarifaires : supplément au-delà de la base.
create table distance_fees (
  id             uuid primary key default gen_random_uuid(),
  pro_id         uuid not null references pros (id) on delete cascade,
  from_km        smallint not null check (from_km >= 0),
  fee_cents      integer not null check (fee_cents >= 0),
  unique (pro_id, from_km)
);

-- ---------------------------------------------------------------------------
-- B11 ③ Horaires récurrents  /  ④ Congés  —  B4 Blocage ponctuel
-- ---------------------------------------------------------------------------

create table working_hours (
  id         uuid primary key default gen_random_uuid(),
  pro_id     uuid not null references pros (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = lundi
  starts_at  time not null,
  ends_at    time not null,
  check (ends_at > starts_at)
);
create index on working_hours (pro_id, weekday);

-- ④ Congés : plages longues d'indisponibilité, distinctes du blocage ponctuel.
create table time_off (
  id         uuid primary key default gen_random_uuid(),
  pro_id     uuid not null references pros (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  label      text,
  check (ends_at > starts_at)
);
create index on time_off (pro_id, starts_at);

-- B4 : le pro verrouille des plages à volonté. « L'app propose, le pro dispose ».
create table blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  pro_id     uuid not null references pros (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  label      text,
  check (ends_at > starts_at)
);
create index on blocked_slots (pro_id, starts_at);

-- ---------------------------------------------------------------------------
-- Réglages d'activité (B9 modes de paiement, A10 délai, A11 confirmation, B7 SMS)
-- ---------------------------------------------------------------------------

create table pro_settings (
  pro_id                    uuid primary key references pros (id) on delete cascade,
  payment_mode              payment_mode not null default 'off',
  -- Acompte par défaut, surchargeable par prestation (services.deposit_percent).
  default_deposit_percent   smallint not null default 100 check (default_deposit_percent between 1 and 100),
  booking_confirmation_mode booking_confirmation_mode not null default 'auto',
  -- A10 : annulation gratuite jusqu'à N heures avant. Configurable par le pro.
  free_cancellation_hours   smallint not null default 24 check (free_cancellation_hours between 0 and 168),
  -- B5 : tampon ajouté à la durée pour une première visite.
  new_client_buffer_min     smallint not null default 0 check (new_client_buffer_min between 0 and 120),
  -- B7 : option SMS entièrement désactivable → bascule e-mail/push gratuits.
  sms_enabled               boolean not null default true,
  gps_app                   text not null default 'system' check (gps_app in ('system', 'waze', 'google_maps')),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- B1 Fiche cliente  /  B2 Annotations techniques
-- ---------------------------------------------------------------------------

create table clients (
  id          uuid primary key default gen_random_uuid(),
  pro_id      uuid not null references pros (id) on delete cascade,
  first_name  text not null,
  last_name   text,
  phone       text,
  email       text,
  -- B2 : mémoire technique du pro (formule couleur, dosages, temps de pose,
  -- produits, sensibilités). Données métier uniquement — jamais de données de
  -- santé (cf. §3.1 de la roadmap : pas d'hébergement HDS, à cadrer dans l'UI).
  technical_notes text,
  -- B8 : fenêtre de retour habituelle, alimentée par l'historique.
  typical_return_days smallint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on clients (pro_id);

create table client_addresses (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  label        text,
  line1        text not null,
  line2        text,
  postal_code  text,
  city         text,
  lat          double precision,
  lng          double precision,
  access_notes text, -- bâtiment, étage, digicode
  is_primary   boolean not null default false
);
create index on client_addresses (client_id);

-- ---------------------------------------------------------------------------
-- B10 Agenda — RDV en ligne ET manuels, même table : les RDV manuels
-- alimentent le moteur géo exactement comme les RDV en ligne.
-- ---------------------------------------------------------------------------

create table appointments (
  id            uuid primary key default gen_random_uuid(),
  pro_id        uuid not null references pros (id) on delete cascade,
  client_id     uuid references clients (id) on delete set null,
  service_id    uuid references services (id) on delete set null,
  -- Libellés figés à la réservation : l'historique ne doit pas bouger si le
  -- pro renomme ou reprice sa prestation plus tard.
  service_name  text not null,
  price_cents   integer not null check (price_cents >= 0),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        appointment_status not null default 'confirmed',
  source        appointment_source not null default 'manual',
  -- Adresse dénormalisée : le RDV a eu lieu là, même si la fiche change ensuite.
  address_line1 text,
  address_line2 text,
  postal_code   text,
  city          text,
  lat           double precision,
  lng           double precision,
  access_notes  text,
  -- B3 : note libre attachée au RDV, distincte de la fiche cliente.
  note          text,
  -- B6 : temps réellement passé, mesuré à la clôture. Nourrit l'apprentissage
  -- des durées à deux niveaux (par pro et par cliente).
  actual_duration_min smallint check (actual_duration_min between 1 and 900),
  completed_at  timestamptz,
  -- C0 : trajet depuis le RDV précédent, affiché sur la timeline du jour.
  travel_min_from_previous smallint,
  cancelled_at  timestamptz,
  cancelled_by  text check (cancelled_by in ('pro', 'client')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on appointments (pro_id, starts_at);
create index on appointments (client_id);

-- A4 — photos jointes par la cliente (cheveux au naturel + inspirations).
-- Qualifient la prestation ET la durée.
create table appointment_photos (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  storage_path   text not null,
  kind           text not null default 'inspiration' check (kind in ('current', 'inspiration')),
  created_at     timestamptz not null default now()
);
create index on appointment_photos (appointment_id);

-- ---------------------------------------------------------------------------
-- G1 Abonnement & facturation — pilote le feature-gating (§2)
-- ---------------------------------------------------------------------------

create table subscriptions (
  pro_id                 uuid primary key references pros (id) on delete cascade,
  tier                   tier not null default 'tier_2', -- essai sur l'offre héros
  status                 subscription_status not null default 'trialing',
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Ambassadrice : 5 ans offerts sur l'abonnement, SMS restant facturés.
  is_ambassador          boolean not null default false,
  ambassador_until       timestamptz,
  updated_at             timestamptz not null default now()
);

-- B7 — forfait SMS par palier, dépassement facturé. Compteur par période.
create table sms_usage (
  pro_id        uuid not null references pros (id) on delete cascade,
  period_start  date not null,
  included      integer not null default 0,
  sent          integer not null default 0,
  primary key (pro_id, period_start)
);

-- Tenue automatique de updated_at.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger t_pros_touch        before update on pros         for each row execute function touch_updated_at();
create trigger t_clients_touch     before update on clients      for each row execute function touch_updated_at();
create trigger t_appts_touch       before update on appointments for each row execute function touch_updated_at();
create trigger t_settings_touch    before update on pro_settings for each row execute function touch_updated_at();
create trigger t_subs_touch        before update on subscriptions for each row execute function touch_updated_at();
