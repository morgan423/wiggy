-- 0015 — D16 : le point de départ de la journée.
--
-- LE DÉFAUT CORRIGÉ : aucun point de départ n'existait. Les trajets se
-- calculaient à partir de la DEUXIÈME étape, si bien que le premier
-- rendez-vous de la journée n'avait aucun trajet amont. Le rappel de départ
-- (C4) ne fonctionnait donc jamais le matin, au moment exact où il est le plus
-- utile.
--
-- ⚠️ CETTE ADRESSE N'EST JAMAIS EXPOSÉE PUBLIQUEMENT. C'est le domicile de la
-- pro dans la plupart des cas, et le principe n°6 du projet est que ses
-- coordonnées précises ne sortent pas. Les colonnes ne sont accordées à `anon`
-- nulle part : la migration 0002 a révoqué tout accès à `pros` pour ce rôle et
-- ne réaccorde qu'une liste nommée, à laquelle celles-ci n'appartiennent pas.
alter table pros
  add column start_line1       text,
  add column start_postal_code text,
  add column start_city        text,
  add column start_lat         double precision,
  add column start_lng         double precision;

comment on column pros.start_lat is
  'D16 : point de depart de la journee, etape zero de la tournee. JAMAIS '
  'expose publiquement (principe n6). Sert a calculer le trajet du premier '
  'rendez-vous et son rappel de depart.';
