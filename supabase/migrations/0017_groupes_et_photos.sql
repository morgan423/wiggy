-- 0017 — B13 (groupes de prestations) et A4 (photos requises par prestation).
--
-- ── B13 : le groupe est un CONFORT, jamais une étape de configuration ──────
--
-- La colonne est nullable, et elle le reste. Une pro avec six prestations n'a
-- rien à ranger : sans catégorie, la liste est plate, sur sa page publique
-- comme dans le parcours de réservation. L'écran ne doit jamais lui donner
-- l'impression qu'il lui manque quelque chose.
--
-- Du texte libre et non une énumération : la liste suggérée (Coupe, Technique,
-- Coiffage, Soins, Homme, Enfant) est une aide à la saisie, pas une grille.
-- Une pro qui travaille les cheveux bouclés rangera autrement, et elle a
-- raison.
alter table services
  add column category text;

comment on column services.category is
  'B13 : groupe optionnel defini par la pro. Nullable et le reste : sans '
  'categorie, la liste est plate partout. Texte libre, la liste suggeree est '
  'une aide a la saisie et non une grille.';

-- ── A4 : les photos deviennent un réglage PAR PRESTATION ──────────────────
--
-- Imposer les photos partout fait abandonner des réservations simples ; ne les
-- imposer nulle part laisse arriver des prestations mal qualifiées. La pro
-- coche là où l'état du cheveu conditionne la durée et le prix.
alter table services
  add column photos_required boolean not null default false;

comment on column services.photos_required is
  'A4 : les photos sont exigees pour CETTE prestation. Coche sur une '
  'coloration ou un balayage, decoche sur une coupe homme.';

-- La cliente doit connaître le groupe avant de réserver, et l'écran de
-- réservation doit savoir s'il faut exiger des photos.
grant select (category, photos_required) on services to anon;
