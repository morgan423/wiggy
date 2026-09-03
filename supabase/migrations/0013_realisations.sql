-- 0013 — A1 : les réalisations de la pro sur sa page publique.
--
-- Planche 15a : « Ses réalisations », 3 à 6 photos, ratio 4:5, défilement
-- horizontal. C'est l'un des cinq manques relevés à la recette du 31/08 : la
-- page fonctionne mais elle ne vend pas, et une coiffeuse se choisit d'abord
-- sur ce qu'elle sait faire.
--
-- ⚠️ À ne surtout pas confondre avec `appointment_photos` (A4), qui sont les
-- photos des CLIENTES, dans un seau privé et sans politique. Celles-ci sont
-- publiques par nature : ce sont des photos de travaux que la pro choisit de
-- montrer. Les deux ne partagent ni table, ni seau, ni règle.
create table pro_photos (
  id         uuid primary key default gen_random_uuid(),
  pro_id     uuid not null references pros (id) on delete cascade,
  -- Chemin dans le seau public, jamais une URL complète : le domaine du
  -- stockage n'a pas à se figer dans les données.
  chemin     text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index pro_photos_pro_idx on pro_photos (pro_id, position);

alter table pro_photos enable row level security;

-- La pro gère les siennes, et elles seules.
create policy pro_photos_self on pro_photos
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

-- Lecture publique, mais UNIQUEMENT pour une page publiée : une fiche en cours
-- de configuration ne laisse rien voir, exactement comme ses prestations.
grant select (id, pro_id, chemin, position) on pro_photos to anon;

create policy pro_photos_publiques on pro_photos
  for select to anon
  using (exists (select 1 from pros p where p.id = pro_photos.pro_id and p.published));
