-- 0026 — G7 : une acceptation disparaît AVEC le compte, jamais toute seule.
-- @sonde: pg_proc?select=proname&proname=eq.acceptance_immuable
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- LE DÉFAUT, constaté le 04/09 par le test de bout en bout. Le déclencheur
-- d'immuabilité de 0021 refuse TOUT `delete`, y compris celui qui vient d'une
-- CASCADE quand on supprime le compte parent. Conséquence : depuis 0021, un
-- compte pro ne peut plus être supprimé du tout.
--
-- Ce n'est pas un détail de test. C'est le DROIT À L'EFFACEMENT (G5, RGPD) qui
-- était cassé : on ne peut pas garder la preuve d'un accord donné par quelqu'un
-- qu'on a l'obligation d'effacer. Entre conserver une preuve et effacer une
-- personne, c'est l'effacement qui gagne, et ce n'est pas un arbitrage que le
-- produit a le loisir de rendre.
--
-- LA RÈGLE JUSTE, et elle tient en une phrase : **une acceptation se supprime
-- avec son sujet, jamais sans lui.** Le déclencheur distingue les deux cas en
-- regardant si le parent existe encore : s'il est là, la suppression est
-- isolée et donc refusée ; s'il a déjà disparu, c'est une cascade et elle
-- passe. Un `update`, lui, reste refusé sans condition : un fait daté ne se
-- corrige pas.

create or replace function acceptance_immuable()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Une acceptation est une preuve : elle ne se modifie pas (G7).';
  end if;

  -- `delete` : refusé tant que le sujet existe encore. Quand il a disparu, nous
  -- sommes dans la cascade de sa propre suppression, et la preuve s'en va avec
  -- lui — c'est ce que l'effacement RGPD exige.
  if old.user_id is not null
     and exists (select 1 from auth.users where id = old.user_id) then
    raise exception
      'Une acceptation ne s''efface pas seule (G7) : elle part avec le compte.';
  end if;
  if old.client_id is not null
     and exists (select 1 from clients where id = old.client_id) then
    raise exception
      'Une acceptation ne s''efface pas seule (G7) : elle part avec la fiche.';
  end if;

  return old;
end
$fn$;

-- Le déclencheur lui-même ne change pas ; seule sa fonction est remplacée.
-- On le repose tout de même pour que la migration reste rejouable seule.
drop trigger if exists acceptances_immuables on acceptances;
create trigger acceptances_immuables
  before update or delete on acceptances
  for each row execute function acceptance_immuable();
