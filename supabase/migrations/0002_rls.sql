-- Wiggy — cloisonnement des données (principe non négociable n°3)
-- Un compte pro n'accède qu'à ses propres données, vérifié CÔTÉ SERVEUR sur
-- chaque table, jamais uniquement côté client.
--
-- Deux rôles seulement sont considérés ici :
--   authenticated → le pro connecté, borné à ses lignes
--   anon          → la cliente finale sur la page de réservation publique,
--                   en lecture seule, sur des colonnes explicitement listées.
-- Toute écriture venant de la cliente (réservation, annulation) passe par une
-- route serveur qui valide disponibilité, zone et tarif : anon n'a JAMAIS
-- de droit d'insertion directe.

alter table pros                  enable row level security;
alter table services              enable row level security;
alter table service_areas         enable row level security;
alter table service_area_communes enable row level security;
alter table distance_fees         enable row level security;
alter table working_hours         enable row level security;
alter table time_off              enable row level security;
alter table blocked_slots         enable row level security;
alter table pro_settings          enable row level security;
alter table clients               enable row level security;
alter table client_addresses      enable row level security;
alter table appointments          enable row level security;
alter table appointment_photos    enable row level security;
alter table subscriptions         enable row level security;
alter table sms_usage             enable row level security;

-- ---------------------------------------------------------------------------
-- Le pro, sur ses propres lignes
-- ---------------------------------------------------------------------------

create policy pro_self on pros
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Tables portant directement pro_id.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'services', 'service_areas', 'service_area_communes', 'distance_fees',
    'working_hours', 'time_off', 'blocked_slots', 'pro_settings',
    'clients', 'appointments', 'sms_usage'
  ] loop
    execute format($p$
      create policy pro_owns on %I
        for all to authenticated
        using (pro_id = (select auth.uid()))
        with check (pro_id = (select auth.uid()));
    $p$, tbl);
  end loop;
end $$;

-- L'abonnement est lisible par son pro, mais jamais modifiable par lui :
-- palier et statut ne changent que via les webhooks Stripe (service role).
create policy sub_read_own on subscriptions
  for select to authenticated
  using (pro_id = (select auth.uid()));

-- Tables filles : le rattachement passe par le parent.
create policy addr_via_client on client_addresses
  for all to authenticated
  using (exists (
    select 1 from clients c
    where c.id = client_addresses.client_id and c.pro_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from clients c
    where c.id = client_addresses.client_id and c.pro_id = (select auth.uid())
  ));

create policy photo_via_appt on appointment_photos
  for all to authenticated
  using (exists (
    select 1 from appointments a
    where a.id = appointment_photos.appointment_id and a.pro_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from appointments a
    where a.id = appointment_photos.appointment_id and a.pro_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- La cliente finale (anon) — page publique A1, lecture seule
-- ---------------------------------------------------------------------------
-- Le filtrage par colonnes est fait au niveau des GRANT, pas seulement dans les
-- requêtes : le téléphone et l'e-mail du pro ne sont jamais exposés à anon,
-- même si une requête cliente les demande explicitement.

revoke all on pros, services, service_areas, service_area_communes, distance_fees from anon;

grant select (id, slug, display_name, headline, bio, city, photo_url,
              instagram_url, years_experience, published)
  on pros to anon;

create policy public_profile on pros
  for select to anon
  using (published);

grant select (id, pro_id, name, description, price_cents, duration_min,
              deposit_percent, active, position)
  on services to anon;

create policy public_services on services
  for select to anon
  using (active and exists (
    select 1 from pros p where p.id = services.pro_id and p.published
  ));

-- La zone d'intervention est publique : la cliente doit savoir si elle est
-- couverte avant de saisir quoi que ce soit (A3, A5, A6).
grant select on service_areas, service_area_communes, distance_fees to anon;

create policy public_area on service_areas
  for select to anon
  using (exists (select 1 from pros p where p.id = service_areas.pro_id and p.published));

create policy public_area_communes on service_area_communes
  for select to anon
  using (exists (select 1 from pros p where p.id = service_area_communes.pro_id and p.published));

create policy public_distance_fees on distance_fees
  for select to anon
  using (exists (select 1 from pros p where p.id = distance_fees.pro_id and p.published));

-- Réglages exposés à anon : uniquement ceux qui pilotent l'affichage côté
-- cliente (S1 — mode de paiement, acompte, délai d'annulation, confirmation
-- manuelle A11). Les autres réglages restent privés.
grant select (pro_id, payment_mode, default_deposit_percent,
              booking_confirmation_mode, free_cancellation_hours)
  on pro_settings to anon;

create policy public_booking_settings on pro_settings
  for select to anon
  using (exists (select 1 from pros p where p.id = pro_settings.pro_id and p.published));

-- Aucune policy anon sur clients, client_addresses, appointments,
-- appointment_photos, subscriptions, sms_usage : RLS activée sans policy = tout
-- accès refusé. C'est volontaire et doit le rester.
