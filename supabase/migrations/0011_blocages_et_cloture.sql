-- 0011 — B4 (blocage manuel) et B6 (clôture en un tap).
--
-- Deux colonnes, et une seule idée derrière chacune : mesurer ce qui s'est
-- réellement passé, plutôt que ce qu'on avait prévu.

-- ── B4 : dater les blocages ────────────────────────────────────────────────
--
-- Sans date de création, on sait quelles plages sont bloquées, jamais À QUELLE
-- FRÉQUENCE la pro bloque. Or c'est précisément ce chiffre qui décidera de D2
-- (synchronisation Google Agenda) pendant la bêta : plusieurs blocages par
-- semaine chez la majorité des testeuses vaut besoin confirmé, quelques-uns par
-- mois vaut « B4 suffit ».
--
-- La colonne est donc de l'instrumentation, pas du confort d'affichage.
alter table blocked_slots
  add column created_at timestamptz not null default now();

comment on column blocked_slots.created_at is
  'D2 : sert à mesurer la fréquence de blocage manuel par pro et par semaine, '
  'chiffre sur lequel la synchronisation d''agenda sera décidée.';

-- ── B6 : le temps réellement passé ─────────────────────────────────────────
--
-- `actual_duration_min` et `completed_at` existent depuis 0001. Il manquait
-- l'index qui rend l'apprentissage des durées consultable sans balayer toute
-- la table : on interroge « les rendez-vous terminés de ce pro, pour cette
-- prestation », à chaque calcul de créneaux.
create index appointments_apprentissage_idx
  on appointments (pro_id, service_id, completed_at)
  where actual_duration_min is not null;
