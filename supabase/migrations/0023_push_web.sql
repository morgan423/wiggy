-- 0023 — C9 ③ : les notifications push web.
-- @sonde: push_subscriptions
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- La bêta tourne sur le web mobile durci en PWA (D4). Le push web est donc le
-- SEUL moyen d'atteindre la pro quand l'app est fermée : sans lui, « prochain
-- rendez-vous » et « rappel de départ » n'existent que si elle pense à ouvrir
-- l'application, c'est-à-dire exactement quand elle n'en a pas besoin.
--
-- UN ABONNEMENT PAR APPAREIL, et c'est la raison de la table plutôt que d'une
-- colonne : une pro a un téléphone ET un ordinateur du soir (D3), et l'endpoint
-- change à chaque réinstallation du navigateur. Une colonne unique perdrait
-- l'un des deux à chaque nouvel abonnement.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  pro_id      uuid not null references pros (id) on delete cascade,
  -- L'URL que le service de push du navigateur nous donne. Elle identifie
  -- l'appareil, elle est unique, et c'est elle qui périme.
  endpoint    text not null unique,
  -- Les deux clés de chiffrement du client. Le contenu d'une notification est
  -- chiffré DE BOUT EN BOUT : ni Apple ni Google ne lisent le nom d'une
  -- cliente en transit.
  p256dh      text not null,
  auth        text not null,
  -- Pour dire à la pro quel appareil elle est en train de délier.
  appareil    text,
  created_at  timestamptz not null default now(),
  -- Un endpoint mort (navigateur désinstallé, abonnement révoqué) se retire
  -- tout seul au premier envoi refusé. On garde la trace du dernier succès
  -- pour pouvoir répondre « oui, ça marche » à une pro qui en doute.
  last_ok_at  timestamptz
);

create index if not exists push_subscriptions_pro_idx on push_subscriptions (pro_id);

comment on table push_subscriptions is
  'C9 : un abonnement push web PAR APPAREIL. Le contenu est chiffre de bout en '
  'bout par le navigateur ; le service de push ne lit rien.';

alter table push_subscriptions enable row level security;

drop policy if exists push_subscriptions_self on push_subscriptions;
create policy push_subscriptions_self on push_subscriptions
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

revoke all on push_subscriptions from anon;
