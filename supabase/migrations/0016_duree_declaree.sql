-- 0016 — D15 corrigée : distinguer une durée MESURÉE d'une durée DÉCLARÉE.
--
-- `actual_duration_min` porte désormais deux choses de nature différente :
--   · une MESURE, quand la pro a clôturé au moment de finir ;
--   · une DÉCLARATION, quand elle a écrit elle-même combien ça a pris.
--
-- La distinction n'est pas cosmétique. Une déclaration est une INSTRUCTION au
-- sens de B5 : elle prime sur tout l'apprentissage, ne se moyenne avec rien, et
-- n'est pas bornée par le catalogue. Une mesure est une observation parmi
-- d'autres. Les confondre reviendrait à noyer ce que la pro a pris la peine de
-- dire dans une médiane.
--
-- On ne la devine pas : deviner marche jusqu'au jour où elle saisit une durée en
-- clôturant à l'heure, et ce jour-là son instruction serait traitée comme une
-- observation sans que personne s'en aperçoive.
alter table appointments
  add column duration_declared boolean not null default false;

comment on column appointments.duration_declared is
  'B5 : la duree a ete ECRITE par la pro, pas mesuree. Instruction et non '
  'observation : elle prime sur l''apprentissage et n''est pas bornee.';
