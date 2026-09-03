-- 0012 — B7 : le compteur mensuel de SMS de service, remis au modèle actuel.
--
-- La table `sms_usage` existe depuis 0001, mais elle portait l'ANCIEN modèle,
-- celui du forfait par palier avec dépassement facturé. B7 a été RÉÉCRITE le
-- 02/09, pas amendée : le dépassement n'est plus facturé, les SMS sont inclus
-- aux paliers 2 et 3, et une clause d'usage raisonnable de 300 par mois figure
-- aux CGV. La colonne `included` n'a donc plus d'objet.
--
-- On la retire plutôt que de la laisser : une colonne morte finit toujours par
-- être relue comme vivante. Elle n'a jamais porté de donnée, aucun SMS n'étant
-- encore parti.
alter table sms_usage drop column included;

-- L'alerte des 80 % part UNE fois par mois. Sans cette date, chaque envoi
-- suivant la ferait repartir, et une notification informative deviendrait un
-- harcèlement mensuel.
alter table sms_usage add column alerted_at timestamptz;

comment on table sms_usage is
  'B7 : compteur mensuel de SMS de service, une ligne par pro et par mois. '
  'JAMAIS affiche a la pro en usage normal (pas de jauge, pas de decompte) : '
  'compter ses SMS n''est pas son metier. Se lit au back office (F3).';

-- La table a déjà la RLS active et AUCUNE politique depuis 0002 : verrouillée
-- par conception, comme `rate_limits`. Ce compteur porte une conséquence
-- financière. Une pro qui pourrait y écrire s'accorderait des SMS ; une pro qui
-- pourrait le lire verrait la jauge que B7 refuse de montrer.
revoke all on sms_usage from anon, authenticated;

-- Incrémente et rend le total, en un aller-retour et sans course.
--
-- Deux envois simultanés ne peuvent pas se marcher dessus : « on conflict do
-- update » est atomique, et c'est la valeur RENVOYÉE qui décide de la bascule,
-- jamais une lecture faite avant elle.
--
-- La REMISE À ZÉRO DU 1er DU MOIS n'est pas une tâche planifiée : elle est une
-- conséquence de la clé. Un nouveau mois, une nouvelle ligne. Rien à faire
-- tourner, donc rien qui puisse ne pas tourner.
create or replace function consommer_sms(p_pro uuid, p_mois date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  insert into sms_usage (pro_id, period_start, sent)
    values (p_pro, p_mois, 1)
  on conflict (pro_id, period_start)
    do update set sent = sms_usage.sent + 1
  returning sent into total;
  return total;
end;
$$;

revoke execute on function consommer_sms(uuid, date) from public, anon, authenticated;

-- Marque l'alerte des 80 % comme envoyée, et dit si c'est la première fois.
-- Le test et l'écriture sont dans la même instruction : deux envois simultanés
-- ne peuvent pas produire deux notifications.
create or replace function marquer_alerte_sms(p_pro uuid, p_mois date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  touchee integer;
begin
  update sms_usage
     set alerted_at = now()
   where pro_id = p_pro and period_start = p_mois and alerted_at is null;
  get diagnostics touchee = row_count;
  return touchee > 0;
end;
$$;

revoke execute on function marquer_alerte_sms(uuid, date) from public, anon, authenticated;
