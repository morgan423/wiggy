import { cookies } from 'next/headers'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import type { Database } from '@wiggy/api'

/**
 * E3 — la télémétrie de bêta. **Le seul point d'écriture de `evenements`.**
 *
 * Aucun composant, aucune action et aucune route n'écrit dans la table
 * directement : tout passe par ici. C'est ce qui rend le filtre RGPD ci-dessous
 * réellement opposable — un filtre qu'on peut contourner ne filtre rien.
 *
 * ⚠️ **CE QUI NE PEUT PAS ENTRER ICI.** Un événement de télémétrie est la
 * porte dérobée idéale pour faire entrer en base une donnée que le produit
 * s'interdit partout ailleurs. Les trois interdits du dépôt s'appliquent donc
 * en toutes lettres, et `nettoyer()` plus bas les fait respecter par la
 * machine :
 *
 * · **aucune donnée personnelle** : ni nom, ni prénom, ni téléphone, ni e-mail,
 *   ni adresse, ni coordonnées géographiques ;
 * · **le genre des clientes n'est ni collecté ni déduit** ;
 * · **la position de la pro n'est jamais stockée** (D16).
 *
 * Ne passent que des **mesures** : des nombres, des rangs, des énumérations
 * courtes. Si une valeur ne tient pas dans cette phrase, elle n'a rien à faire
 * dans cette table.
 */

type Kind = Database['public']['Enums']['evenement_kind']

/**
 * Les clés autorisées dans `details`, par événement. Une clé absente de cette
 * liste est SILENCIEUSEMENT ÉCARTÉE plutôt que refusée : mieux vaut une mesure
 * incomplète qu'une écriture perdue ou, pire, une donnée personnelle acceptée
 * parce que quelqu'un aura ajouté un champ sans y penser.
 */
const CLES_AUTORISEES: Record<Kind, readonly string[]> = {
  // ① Calibre A12. L'étage, le rang dans la liste, le coût marginal en minutes,
  // le score. Aucun lieu, aucune heure absolue : le RANG suffit à calibrer.
  creneau_choisi: ['etage', 'rang', 'cout_marginal_min', 'score', 'total_proposes'],
  // ② Décide de D2.
  blocage_manuel: ['duree_min', 'recurrent'],
  // ③ L'entonnoir. `etape` est une énumération de nos propres écrans.
  tunnel_etape: ['etape', 'issue'],
  // ④ En ligne contre saisie manuelle.
  rdv_cree: ['source', 'hors_zone', 'statut'],
  // ⑤ L'objectif des 48 h de G3.
  premiere_reservation: ['heures_depuis_inscription'],
  // ⑥ Les contre-propositions (A11).
  contre_proposition: ['issue', 'delai_reponse_h'],
  // ⑦ Le plafond SMS de B7.
  sms_envoye: ['motif', 'mois'],
  // ⑧ La PWA (C9).
  usage_app: ['action', 'hors_ligne'],
}

/** Un nom de cookie, pas un identifiant : il ne survit pas à la session. */
const COOKIE_SESSION = 'wiggy_s'

export type DetailsEvenement = Record<string, string | number | boolean | null>

/**
 * Enregistre un événement PRO, rattaché au compte.
 *
 * Ne lève jamais et ne bloque jamais l'appelant : une mesure qui échoue ne doit
 * pas faire échouer une réservation. On mesure le produit, on ne le met pas en
 * péril pour le mesurer.
 */
export async function mesurerPro(
  kind: Kind,
  proId: string,
  details: DetailsEvenement = {},
): Promise<void> {
  await ecrire(kind, { pro_id: proId, session: null }, details)
}

/**
 * Enregistre un événement CLIENTE, sous un identifiant de session éphémère.
 *
 * **Jamais d'identité.** Le cookie est de session — il meurt à la fermeture du
 * navigateur — et ne contient qu'un nombre aléatoire. Il ne permet que de
 * relier entre elles les étapes d'une même visite, ce qui est exactement ce que
 * l'entonnoir demande, et rien de plus. Ni rejeu, ni enregistrement d'écran, ni
 * empreinte de navigateur.
 */
export async function mesurerVisite(kind: Kind, details: DetailsEvenement = {}): Promise<void> {
  const session = await identifiantDeSession()
  if (!session) return
  await ecrire(kind, { pro_id: null, session }, details)
}

async function ecrire(
  kind: Kind,
  sujet: { pro_id: string | null; session: string | null },
  details: DetailsEvenement,
): Promise<void> {
  if (!supabaseConfigured()) return
  const { error } = await supabaseAdmin()
    .from('evenements')
    .insert({ kind, ...sujet, details: nettoyer(kind, details) })
  if (error) console.error('telemetrie_echec', kind, error.code)
}

/**
 * Le filtre. **C'est la seule chose qui rend le cadrage RGPD vrai plutôt
 * qu'annoncé.**
 *
 * Il ne garde que les clés déclarées pour cet événement, et n'accepte comme
 * valeurs que des nombres, des booléens et des **chaînes courtes** — une chaîne
 * longue est le format naturel d'un nom, d'une adresse ou d'une note, et aucune
 * des huit questions n'en a besoin.
 */
function nettoyer(kind: Kind, details: DetailsEvenement): DetailsEvenement {
  const autorisees = CLES_AUTORISEES[kind]
  const propre: DetailsEvenement = {}
  for (const [cle, valeur] of Object.entries(details)) {
    if (!autorisees.includes(cle)) continue
    if (typeof valeur === 'number' || typeof valeur === 'boolean') propre[cle] = valeur
    else if (typeof valeur === 'string' && valeur.length <= 32) propre[cle] = valeur
  }
  return propre
}

/**
 * L'identifiant de session, posé à la première mesure.
 *
 * `httpOnly` et sans `maxAge` : il ne quitte pas le serveur, et il meurt avec
 * l'onglet. Dans un composant qui ne peut pas écrire de cookie (un rendu de
 * page), on rend `null` et l'événement est simplement perdu : mieux vaut une
 * mesure manquante qu'un identifiant persistant posé par surprise.
 */
async function identifiantDeSession(): Promise<string | null> {
  const bocal = await cookies()
  const existant = bocal.get(COOKIE_SESSION)?.value
  if (existant) return existant
  const nouveau = crypto.randomUUID()
  try {
    bocal.set(COOKIE_SESSION, nouveau, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  } catch {
    return null
  }
  return nouveau
}
