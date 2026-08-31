# Matrice d'accès aux données

> **Fichier généré** par `npm run db:matrice` depuis le schéma réel.
> Ne pas le modifier à la main : modifier les migrations, puis régénérer.

Trois rôles interviennent :

- **visiteuse anonyme** (`anon`) : la cliente finale sur la page publique. Sa clé est
  publique par nature : tout ce qui lui est ouvert est ouvert au monde entier.
- **pro authentifié** (`authenticated`) : un compte connecté. Son identité vient du jeton,
  jamais d'un paramètre.
- **serveur** (`service_role`) : les routes serveur. Contourne la RLS, mais **pas** les
  contraintes ni les déclencheurs.

## Politiques, table par table

| Table | Politique | Lignes concernées |
|---|---|---|
| `appointment_photos` | `photo_via_appt` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(EXISTS ( SELECT 1 FROM appointments a WHERE ((a.id = appointment_photos.appointment_id) AND (a.pro_id = auth.uid()))))` |
| `appointments` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `blocked_slots` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `city_waitlist` | 🔒 RLS active, **aucune politique** | Verrouillée par conception : écriture via route serveur uniquement (service_role). |
| `client_addresses` | `addr_via_client` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(EXISTS ( SELECT 1 FROM clients c WHERE ((c.id = client_addresses.client_id) AND (c.pro_id = auth.uid()))))` |
| `clients` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `distance_fees` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `distance_fees` | `public_distance_fees` : visiteuse anonyme peut **lire** | `(EXISTS ( SELECT 1 FROM pros p WHERE ((p.id = distance_fees.pro_id) AND p.published)))` |
| `geocodage_refus` | 🔒 RLS active, **aucune politique** | Verrouillée par conception : écriture via route serveur uniquement (service_role). |
| `pro_settings` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `pro_settings` | `public_booking_settings` : visiteuse anonyme peut **lire** | `(EXISTS ( SELECT 1 FROM pros p WHERE ((p.id = pro_settings.pro_id) AND p.published)))` |
| `pros` | `pro_self` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(id = auth.uid())` |
| `pros` | `public_profile` : visiteuse anonyme peut **lire** | `published` |
| `rate_limits` | 🔒 RLS active, **aucune politique** | Verrouillée par conception : écriture via route serveur uniquement (service_role). |
| `service_area_communes` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `service_area_communes` | `public_area_communes` : visiteuse anonyme peut **lire** | `(EXISTS ( SELECT 1 FROM pros p WHERE ((p.id = service_area_communes.pro_id) AND p.published)))` |
| `service_areas` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `service_areas` | `public_area` : visiteuse anonyme peut **lire** | `(EXISTS ( SELECT 1 FROM pros p WHERE ((p.id = service_areas.pro_id) AND p.published)))` |
| `services` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `services` | `public_services` : visiteuse anonyme peut **lire** | `(active AND (EXISTS ( SELECT 1 FROM pros p WHERE ((p.id = services.pro_id) AND p.published))))` |
| `sms_usage` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `subscriptions` | `sub_read_own` : pro authentifié peut **lire** | `(pro_id = auth.uid())` |
| `time_off` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |
| `working_hours` | `pro_owns` : pro authentifié peut **lire/écrire/modifier/supprimer** | `(pro_id = auth.uid())` |

## Colonnes lisibles par une visiteuse anonyme

Le filtrage ne repose pas que sur les politiques : les droits sont accordés colonne par
colonne. Une requête qui demande une colonne absente de cette liste est refusée par la
base, quelle qu'en soit la provenance.

| Table | Colonnes exposées |
|---|---|
| `distance_fees` | `fee_cents`, `from_km`, `id`, `pro_id` |
| `pro_settings` | `booking_confirmation_mode`, `default_deposit_percent`, `free_cancellation_hours`, `payment_mode`, `pro_id` |
| `pros` | `bio`, `city`, `display_name`, `headline`, `id`, `instagram_url`, `photo_url`, `pronoun`, `published`, `slug`, `years_experience` |
| `service_area_communes` | `insee_code`, `lat`, `lng`, `name`, `postal_code`, `pro_id` |
| `service_areas` | `mode`, `pro_id` |
| `services` | `active`, `deposit_percent`, `description`, `duration_min`, `id`, `name`, `position`, `price_cents`, `pro_id` |

## Pourquoi chaque lecture anonyme existe

Ce qui est ouvert à `anon` est ouvert au monde entier : la clé anonyme est publique.
Chaque politique de lecture doit donc répondre à une seule question : **la cliente en a-t-elle
besoin avant de réserver ?**

### `public_distance_fees` · `distance_fees`

Le supplément kilométrique fait partie du prix annoncé (A8). Le cacher jusqu'au paiement serait une mauvaise surprise, et la roadmap exige des tarifs justes sur la page publique.

### `public_booking_settings` · `pro_settings`

Pilote l'affichage des conditions de paiement côté cliente (S1) : mode de paiement, pourcentage d'acompte, délai d'annulation, confirmation manuelle. Sans ces quatre réglages, la page ne peut pas dire à la cliente ce qu'elle va payer et quand. Les autres réglages du pro (SMS, tampons, GPS) ne sont pas exposés.

### `public_profile` · `pros`

La page de réservation est publique par nature (A1) et doit être indexable par Google : c'est le moteur d'acquisition organique du pro (A2). Restreinte aux fiches `published` : une fiche en cours de configuration reste invisible. Téléphone et e-mail du pro ne sont pas dans les colonnes exposées.

### `public_area_communes` · `service_area_communes`

Même raison : la liste des communes desservies est ce qui permet d'annoncer « je me déplace chez vous » ou « vous êtes hors zone » sans faire perdre son temps à la cliente.

### `public_area` · `service_areas`

La cliente doit savoir si elle est dans la zone d'intervention avant de saisir quoi que ce soit, sinon elle remplit un formulaire pour rien (A3, A5, A6).

### `public_services` · `services`

La cliente doit voir prestations, prix et durées avant de réserver : des tarifs affichés sont une exigence explicite de A1. Restreinte aux prestations actives d'une fiche publiée : une prestation masquée disparaît de la page.

## Ce qui n'est jamais exposé

Aucune politique anonyme ne touche `clients`, `client_addresses`, `appointments`,
`appointment_photos`, `subscriptions`, `sms_usage`, `blocked_slots`, `time_off`,
`working_hours`, `city_waitlist` ni `rate_limits`. Les noms, téléphones, adresses de
domicile et photos des clientes sont des données personnelles : elles ne sortent jamais du
compte de leur pro.
