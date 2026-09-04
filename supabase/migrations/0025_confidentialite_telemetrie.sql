-- 0025 — E3 : la finalité « amélioration du service » entre dans la politique
-- de confidentialité.
-- @sonde: legal_documents?slug=eq.confidentialite&version=eq.0.2-beta
--
-- Sonde de LIGNE, et non d'objet : cette migration n'ajoute aucune table ni
-- aucune colonne, elle insère un texte. Lui donner la sonde de 0021 la ferait
-- passer pour appliquée dès que 0021 l'est, et `db:etat` mentirait.
--
-- ⚠️ IDEMPOTENTE : voir l'en-tête de 0017.
--
-- G7 a été construit exactement pour ce moment : un texte contractuel change,
-- et AUCUNE ligne de code ne bouge. C'est une LIGNE DE PLUS dans
-- `legal_documents`, jamais une mise à jour de l'ancienne — les pros qui ont
-- accepté la 0.1 restent attachés au texte qu'elles ont réellement lu, et la
-- 0.2 leur sera redemandée par `documentsARedemander`.
--
-- C'est aussi la démonstration que la mécanique tient : si cette migration
-- avait dû toucher un fichier `.tsx`, G7 serait faux.

insert into legal_documents (slug, version, effective_on, titre, corps) values
  ('confidentialite', '0.2-beta', date '2026-01-01', 'Politique de confidentialité',
   E'**Version provisoire de bêta.** Ce texte sera remplacé par la politique '
   'définitive avant l''ouverture commerciale.\n\nLes données de tes clientes '
   't''appartiennent. Wiggy ne les revend pas et ne les exploite pas à des fins '
   'publicitaires. Aucune donnée de santé n''est collectée. La position '
   'ponctuelle utilisée pour calculer un trajet n''est jamais conservée.\n\n'
   '**Amélioration du service.** Pendant la bêta, Wiggy enregistre des mesures '
   'd''usage rattachées à ton compte : quels créneaux sont choisis, combien de '
   'rendez-vous viennent de ta page et combien tu saisis toi-même, ton volume '
   'de SMS, et si tu consultes ta tournée hors connexion. Ces mesures servent à '
   'régler le produit, et à rien d''autre. Elles ne sont ni revendues ni '
   'transmises à un tiers, et aucun outil de mesure extérieur n''est installé.\n\n'
   '**Du côté de tes clientes**, rien de tout cela n''est nominatif : leur '
   'parcours de réservation est mesuré sous un identifiant temporaire qui '
   'disparaît à la fermeture de leur navigateur. Ni leur nom, ni leur téléphone, '
   'ni leur adresse n''entrent dans ces mesures.\n\nCes mesures sont effacées '
   'au bout de douze mois.')
on conflict (slug, version) do nothing;
