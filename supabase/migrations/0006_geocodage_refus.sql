-- Moniteur des refus de géocodage.
--
-- La validation d'adresse est volontairement stricte : elle refuse plutôt que
-- d'envoyer un pro à cent kilomètres (le cas « 12 rue des Lilas Pau », que la
-- BAN place à Saint-Paul-lès-Dax). Une validation stricte produit des faux
-- négatifs : des clientes légitimes qui ont mal tapé leur rue.
--
-- Cette table sert à les voir. En bêta, elle dit d'un coup d'oeil si le seuil
-- est trop serré, sans quoi on ne saurait jamais qui a abandonné.
--
-- RGPD : on enregistre la saisie et les candidats proposés, jamais le nom, le
-- téléphone ni l'e-mail de la personne. C'est une table de diagnostic, à
-- purger régulièrement, pas un historique de clientes.
create table geocodage_refus (
  id             uuid primary key default gen_random_uuid(),
  -- Ce que la personne a tapé.
  requete        text not null,
  code_postal    text,
  ville          text,
  -- Ce que la BAN a proposé et qu'on a écarté : libellé, code postal, score.
  candidats      jsonb not null default '[]'::jsonb,
  -- D'où vient la saisie : réservation cliente ou rendez-vous manuel du pro.
  origine        text not null check (origine in ('reservation', 'rdv_manuel')),
  created_at     timestamptz not null default now()
);
create index on geocodage_refus (created_at desc);

alter table geocodage_refus enable row level security;
-- Aucune politique : lecture et écriture en service role uniquement, comme
-- city_waitlist et rate_limits. La saisie passe par une route serveur.

-- Purge : au-delà de 90 jours, un refus n'apprend plus rien et ne doit plus
-- être conservé. À appeler depuis une tâche planifiée.
create or replace function purger_geocodage_refus() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  supprimes integer;
begin
  delete from geocodage_refus where created_at < now() - interval '90 days';
  get diagnostics supprimes = row_count;
  return supprimes;
end;
$$;

revoke execute on function purger_geocodage_refus() from public, anon, authenticated;
