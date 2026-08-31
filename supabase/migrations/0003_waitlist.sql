-- A9 — recherche par ville + liste d'attente clientes.
-- Triple fonction : tenir la promesse client sans annuaire vide, capter la
-- demande, et alimenter la carte de chaleur par ville (prospection + argument
-- de vente « X clientes attendent à [ville] »).

create table city_waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (position('@' in email) > 1),
  -- Clé de regroupement : code INSEE quand on l'a, sinon le nom normalisé.
  -- C'est elle qui porte l'unicité et le comptage de la carte de chaleur.
  city_key     text not null,
  city_name    text not null,
  postal_code  text,
  insee_code   text,
  created_at   timestamptz not null default now(),
  -- Renseigné quand la cliente a été prévenue de l'ouverture d'une pro.
  notified_at  timestamptz,
  unique (email, city_key)
);
create index on city_waitlist (city_key);

alter table city_waitlist enable row level security;

-- Aucune policy : ni anon ni authenticated n'y touchent directement.
-- L'inscription passe par une route serveur (validation + anti-abus) et la
-- lecture agrégée par le back office (F3), tous deux en service role.
