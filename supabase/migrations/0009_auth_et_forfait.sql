-- D9 : authentification du pro, et A8 : le forfait de déplacement de base.
--
-- ── D9 ────────────────────────────────────────────────────────────────────
-- Le pro a un vrai compte : e-mail et mot de passe, avec e-mail ET téléphone
-- vérifiés, les deux imposés avant la mise en ligne de sa page. C'est un
-- titulaire durable, avec des données, une facturation et un besoin de
-- récupération. Le téléphone vérifié devient d'ailleurs son canal de
-- récupération de mot de passe : le trou signalé le 31/08, l'absence totale de
-- récupération de compte, se referme sans chantier dédié.
--
-- ── A8 ────────────────────────────────────────────────────────────────────
-- `distance_fees` reprend du service pour le forfait de base, mais PERD SA
-- LECTURE PUBLIQUE. Le montant ne sort plus jamais côté cliente : un « +10 € »
-- affiché ancrerait la pro trop bas quand le trajet est long. La cliente
-- découvre le montant dans la proposition de la pro, et le confirme.

-- ---------------------------------------------------------------------------
-- D9 ① Ce qui est vérifié
-- ---------------------------------------------------------------------------

-- Le téléphone du pro. L'e-mail, lui, est déjà porté par `auth.users`
-- (`email_confirmed_at`) : le dupliquer ici créerait deux vérités.
alter table pros add column phone_verified_at timestamptz;

-- Côté cliente, la structure existe DÈS MAINTENANT même si l'écran arrive en
-- livraison 2. Un numéro se vérifie une seule fois et se retient : vérifier à
-- chaque réservation ajouterait un SMS par rendez-vous, soit 43 % de plus sur
-- le poste variable dominant. La colonne est ce qui rend cette mémoire
-- possible ; sans elle, la livraison 2 devrait revenir sur le schéma.
alter table clients add column phone_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- D9 ② Les codes de vérification
-- ---------------------------------------------------------------------------
-- Le code n'est jamais stocké en clair : seule son empreinte l'est. Une fuite
-- de cette table ne doit pas permettre de prendre la main sur un compte.
--
-- VERROUILLÉE PAR CONCEPTION, comme `city_waitlist`, `rate_limits` et
-- `geocodage_refus` : RLS active, AUCUNE politique. L'écriture et la lecture
-- passent par la route serveur en service_role, qui porte les plafonds
-- anti-pompage. Ne pas « réparer » en ajoutant une politique.
create table phone_verifications (
  id           uuid primary key default gen_random_uuid(),
  -- Le compte concerné. Une vérification de cliente (livraison 2) n'a pas de
  -- compte : elle portera son numéro et rien d'autre.
  pro_id       uuid references pros (id) on delete cascade,
  -- Numéro au format saisi, normalisé par l'application.
  phone        text not null,
  -- SHA-256 du code, salé côté application. Jamais le code lui-même.
  code_hash    text not null,
  -- À quoi sert ce code : vérifier un numéro, ou rouvrir un compte.
  usage        text not null default 'verification'
               check (usage in ('verification', 'recuperation')),
  expires_at   timestamptz not null,
  -- Plafond de tentatives : un code à cinq chiffres se devine en 100 000
  -- essais, ce qui est peu si on laisse essayer.
  attempts     smallint not null default 0,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on phone_verifications (phone, created_at desc);
create index on phone_verifications (pro_id) where consumed_at is null;

alter table phone_verifications enable row level security;

-- Purge : un code expiré n'apprend rien et ne doit pas traîner. À appeler
-- depuis une tâche planifiée, comme `purger_geocodage_refus()`.
create or replace function purger_codes_expires() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  supprimes integer;
begin
  delete from phone_verifications where expires_at < now() - interval '1 day';
  get diagnostics supprimes = row_count;
  return supprimes;
end;
$$;

revoke execute on function purger_codes_expires() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A8 Le forfait de déplacement de base perd sa lecture publique
-- ---------------------------------------------------------------------------
-- La politique et le droit de lecture disparaissent ensemble : laisser l'un
-- sans l'autre donnerait une fausse impression de fermeture.
drop policy public_distance_fees on distance_fees;
revoke select on distance_fees from anon;

comment on table distance_fees is
  'A8 : forfait de déplacement. Le montant ne sort JAMAIS côté cliente '
  '(décision du 02/09) : la page annonce qu''un forfait peut s''appliquer, '
  'sans chiffre, et la cliente découvre le montant dans la proposition de la '
  'pro puis le confirme. La ligne from_km = 0 porte le forfait de base.';
