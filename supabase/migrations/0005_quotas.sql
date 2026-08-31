-- Garde-fous anti-abus de la liste d'attente (A9).
--
-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ DÉCISION D'ARCHITECTURE — NE PAS « RÉPARER »                          │
-- │                                                                       │
-- │ `city_waitlist` a la RLS active et AUCUNE politique. Ce n'est pas un   │
-- │ oubli : la table est verrouillée par conception. Toute écriture passe  │
-- │ par la route serveur, en service_role, qui valide le format, applique  │
-- │ un quota par appelant et un piège anti-robot.                         │
-- │                                                                       │
-- │ Ouvrir un INSERT au rôle `anon` rendrait la table écrivable            │
-- │ directement via PostgREST avec la clé anonyme, qui est publique — donc │
-- │ en contournant ces trois protections. Un test le vérifie et échouera   │
-- │ si quelqu'un ajoute une telle politique.                              │
-- └───────────────────────────────────────────────────────────────────────┘

-- ---------------------------------------------------------------------------
-- Plafond par adresse e-mail
-- ---------------------------------------------------------------------------
-- Défense en profondeur : s'applique quel que soit le chemin d'écriture, y
-- compris en service_role, qui contourne la RLS mais pas les déclencheurs.
--
-- `security definer` : le comptage doit voir les lignes, ce qu'aucun rôle
-- ordinaire ne peut faire sur cette table.
create or replace function limiter_liste_attente() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recentes integer;
begin
  select count(*) into recentes
  from city_waitlist
  where email = new.email
    and created_at > now() - interval '1 hour';

  if recentes >= 5 then
    raise exception 'Trop de demandes pour cette adresse. Réessayez plus tard.'
      using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger t_waitlist_limite
  before insert on city_waitlist
  for each row execute function limiter_liste_attente();

-- ---------------------------------------------------------------------------
-- Compteurs de quota applicatifs (fenêtre glissante)
-- ---------------------------------------------------------------------------
-- Partagés entre toutes les instances du serveur : un compteur en mémoire ne
-- verrait qu'une instance sur N et repartirait à zéro à chaque déploiement.
--
-- La clé est un condensat : on n'enregistre jamais d'adresse IP en clair, une
-- IP étant une donnée personnelle (principe non négociable n°3).
create table rate_limits (
  cle            text primary key,
  fenetre_debut  timestamptz not null default now(),
  compteur       integer not null default 0
);

alter table rate_limits enable row level security;
-- Aucune politique, comme city_waitlist : service_role uniquement.

-- Les paramètres sont préfixés : un paramètre nommé `cle` entrerait en
-- collision avec la colonne `cle` dans le ON CONFLICT (« column reference is
-- ambiguous ») et la fonction échouerait à chaque appel.
create or replace function consommer_quota(
  p_cle text,
  p_limite integer,
  p_fenetre_sec integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  courant rate_limits%rowtype;
begin
  insert into rate_limits (cle, fenetre_debut, compteur)
  values (p_cle, now(), 1)
  on conflict (cle) do update
    set compteur = case
          when rate_limits.fenetre_debut < now() - make_interval(secs => p_fenetre_sec) then 1
          else rate_limits.compteur + 1
        end,
        fenetre_debut = case
          when rate_limits.fenetre_debut < now() - make_interval(secs => p_fenetre_sec) then now()
          else rate_limits.fenetre_debut
        end
  returning * into courant;

  return courant.compteur <= p_limite;
end;
$$;

revoke execute on function consommer_quota(text, integer, integer) from public, anon, authenticated;
