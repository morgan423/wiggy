-- Amorçage d'un compte pro.
--
-- Dès qu'une ligne `pros` est créée, le compte doit avoir des réglages et un
-- abonnement : sans eux, le feature-gating n'a rien à lire et l'app plante au
-- premier écran. On le fait dans la base plutôt que dans l'app pour que ce soit
-- vrai quelle que soit la surface qui crée le compte (web, mobile, back office).
--
-- `security definer` est nécessaire : la policy de `subscriptions` interdit
-- l'écriture au pro (palier et statut ne bougent que par webhook Stripe).

create or replace function bootstrap_pro() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pro_settings (pro_id) values (new.id) on conflict do nothing;

  -- Essai sur l'offre héros : la pro découvre le produit avec la tournée (§4).
  -- ⚠️ 30 jours est aussi défini dans packages/core (TRIAL_DAYS) : les deux
  -- doivent rester d'accord.
  insert into subscriptions (pro_id, tier, status, trial_ends_at)
  values (new.id, 'tier_2', 'trialing', now() + interval '30 days')
  on conflict do nothing;

  return new;
end;
$$;

create trigger t_pros_bootstrap
  after insert on pros
  for each row execute function bootstrap_pro();
