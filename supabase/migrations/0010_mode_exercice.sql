-- 0010 — Mode d'exercice : itinérante ou fixe (décision D10 ①).
--
-- On RÉSERVE la place, on ne la meuble pas. La variante fixe complète
-- (onboarding, page publique « vous reçoit à », copilote sans GPS) se construit
-- après la bêta coiffure. Ce qui se fait aujourd'hui, c'est la colonne : elle
-- coûte une ligne maintenant et évite une migration douloureuse plus tard,
-- quand des rendez-vous et des fiches y seront accrochés.
--
-- ⚠️ Ce drapeau n'est JAMAIS un droit (D10 ③). Le gating reste par palier, et
-- lui seul : `packages/core/src/tiers.ts` ne connaît pas ce champ et ne doit
-- pas le connaître. Le mode ne décide que de ce qui s'affiche.

alter table pros
  add column mode text not null default 'itinerant'
    check (mode in ('itinerant', 'fixe'));

comment on column pros.mode is
  'D10 : itinerant (défaut) ou fixe. Drapeau d''AFFICHAGE, jamais un droit. '
  'En mode fixe, aucune adresse cliente n''est collectée : minimisation RGPD, '
  'il n''y a pas de finalité.';

-- La page de réservation est publique, et c'est elle qui doit savoir s'il faut
-- demander une adresse. Le mode n'est pas une donnée personnelle : c'est la
-- façon dont la pro exerce, et elle est de toute façon lisible de sa page.
grant select (mode) on pros to anon;
