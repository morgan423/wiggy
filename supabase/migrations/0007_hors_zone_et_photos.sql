-- A5 / A6 : la cliente hors zone. Et A4 : les photos jointes à la réservation.
--
-- A6 pose une règle de produit, pas une contrainte technique : une demande au
-- dela de la zone n'est pas rejetée. Elle naît « sous réserve de validation »
-- (statut `conditional`, déjà prévu en 0001) et le pro tranche.
--
-- A5 est l'autre issue de la même impasse : la cliente n'habite pas là, elle y
-- séjourne. C'est alors l'adresse de séjour qui compte pour le moteur géo, et
-- le pro a besoin des dates pour comprendre la demande.

-- ---------------------------------------------------------------------------
-- Le domicile du pro n'est jamais public
-- ---------------------------------------------------------------------------
-- La 0002 accordait `service_areas` en entier au rôle anonyme. En mode
-- « communes » cela ne dit rien de personnel, mais en mode « rayon » les
-- colonnes `center_lat` / `center_lng` sont, en pratique, le domicile de la
-- pro : c'est de chez elle qu'elle mesure son rayon d'intervention.
--
-- La clé anonyme est publique. Exposer ces deux colonnes, c'est publier
-- l'adresse d'une femme qui travaille seule. On ne garde que ce dont la page
-- a besoin : le mode. Les communes desservies restent publiques, elles.
revoke select on service_areas from anon;
grant select (pro_id, mode) on service_areas to anon;

-- Comment les clientes parlent du pro. Nullable à dessein : on ne devine pas.
-- Sans réponse, les textes basculent sur une formulation sans pronom plutôt
-- que de supposer « elle » pour tout le monde.
alter table pros add column pronoun text check (pronoun in ('elle', 'il'));
grant select (pronoun) on pros to anon;

alter table appointments
  -- Mémoire de la décision : un rendez-vous accepté hors zone reste un
  -- rendez-vous hors zone. C'est ce qui permettra de mesurer, en bêta, si la
  -- zone déclarée correspond à la zone réellement parcourue (B11, A8).
  add column out_of_zone boolean not null default false,
  -- A5 : bornes du séjour. La cliente est joignable à cette adresse entre ces
  -- deux dates, et nulle part ailleurs.
  add column stay_from date,
  add column stay_to date,
  -- Jeton de suivi : le seul moyen, pour une cliente sans compte, de revenir
  -- voir ce que le pro a répondu. Il est aléatoire et non devinable ; il ne
  -- donne accès qu'à ce rendez-vous, jamais à l'agenda.
  add column public_token uuid not null default gen_random_uuid(),
  add constraint stay_coherent check (
    (stay_from is null and stay_to is null)
    or (stay_from is not null and stay_to is not null and stay_to >= stay_from)
  );

create unique index appointments_public_token on appointments (public_token);

-- Les demandes en attente de décision sont consultées à chaque ouverture de
-- l'agenda : elles méritent leur propre index, elles restent peu nombreuses.
create index appointments_a_decider
  on appointments (pro_id, starts_at)
  where status in ('pending', 'conditional');

-- ---------------------------------------------------------------------------
-- A4 — photos de la réservation
-- ---------------------------------------------------------------------------
-- La table `appointment_photos` existe depuis 0001 ; il manquait le stockage.
--
-- Le seau est PRIVÉ et n'a aucune politique sur `storage.objects` : ni la
-- cliente ni le pro n'atteignent un fichier directement. Tout passe par le
-- serveur, qui vérifie l'appartenance du rendez-vous puis délivre une URL
-- signée à durée courte.
--
-- Ce sont des photos de personnes. Le défaut le plus sûr est le seul
-- acceptable : verrouillé par conception, comme `city_waitlist` et
-- `geocodage_refus`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'appointment-photos',
  'appointment-photos',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
