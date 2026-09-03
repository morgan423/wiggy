-- 0014 — D15 : le lancement de journée.
--
-- L'état d'un rendez-vous se déduit de ce que la pro a FAIT, jamais de
-- l'horloge. « En cours » suppose donc qu'elle soit partie, et c'est cette
-- table qui le sait. Sans elle, un rendez-vous dont l'heure est passée serait
-- « en cours » alors que rien ne dit que quiconque a bougé.
--
-- Une ligne par pro et par jour. La journée se lance de deux façons, et les
-- deux valent lancement : le bouton en tête de la tournée, et l'ouverture du
-- premier GPS (C3). La seconde est la plus honnête des deux : personne n'ouvre
-- un itinéraire sans partir.
create table journees (
  pro_id    uuid not null references pros (id) on delete cascade,
  jour      date not null,
  lancee_at timestamptz not null default now(),
  primary key (pro_id, jour)
);

comment on table journees is
  'D15 : une ligne quand la pro a lance sa journee. Sert a distinguer '
  '« en cours » de « a cloturer ». Aucune cloture ne s''en deduit : seule la '
  'pro cloture, et jamais l''horloge.';

alter table journees enable row level security;

-- La pro lance ses journées, et les siennes seules. Rien à lire pour personne
-- d'autre : ce n'est ni public, ni utile à une cliente.
create policy journees_self on journees
  for all to authenticated
  using (pro_id = auth.uid())
  with check (pro_id = auth.uid());

revoke all on journees from anon;
