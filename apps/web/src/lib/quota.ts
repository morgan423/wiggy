import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { supabaseAdmin, supabaseConfigured } from './supabase/admin'

/**
 * Rate limiting applicatif, adossé à la table `rate_limits`.
 *
 * Compté en base et non en mémoire : un compteur en mémoire ne verrait qu'une
 * instance sur N et repartirait à zéro à chaque déploiement.
 *
 * Portée : ceci protège le chemin applicatif, qui est le SEUL chemin d'écriture
 * ouvert. `city_waitlist`, `rate_limits`, `geocodage_refus` et
 * `phone_verifications` sont verrouillées par conception, RLS active et aucune
 * politique : rien ne s'y écrit via PostgREST. Le plafond par adresse de la
 * migration 0005 reste la seconde ceinture, côté base.
 */

/** Empreinte de l'IP appelante. On ne stocke jamais l'IP : c'est une donnée personnelle. */
async function empreinteAppelant(): Promise<string> {
  const entetes = await headers()
  // x-forwarded-for peut chaîner plusieurs adresses : la première est le client.
  // Premier en-tête non vide. Un `??` ne conviendrait pas : ces en-têtes
  // existent parfois avec une valeur vide, qu'il faut ignorer comme une absence.
  const ip =
    [entetes.get('x-forwarded-for')?.split(',')[0], entetes.get('x-real-ip')]
      .map((v) => v?.trim())
      .find((v) => v) ?? 'inconnue'

  const sel = process.env.RATE_LIMIT_SALT ?? ''
  return createHash('sha256').update(`${sel}:${ip}`).digest('hex').slice(0, 32)
}

/**
 * Consomme un jeton. Renvoie false si le quota est dépassé.
 *
 * En cas d'indisponibilité de la base, on laisse passer : un compteur en panne
 * ne doit pas fermer le service. Le risque assumé est un abus temporaire, pas
 * une interruption pour tout le monde.
 */
export async function quotaDisponible(
  prefixe: string,
  limite: number,
  fenetreSecondes: number,
): Promise<boolean> {
  if (!supabaseConfigured()) return true

  const cle = `${prefixe}:${await empreinteAppelant()}`
  const { data, error } = await supabaseAdmin().rpc('consommer_quota', {
    p_cle: cle,
    p_limite: limite,
    p_fenetre_sec: fenetreSecondes,
  })

  if (error) {
    console.error('quota_indisponible', error.code)
    return true
  }
  return data
}

/**
 * Quota non lié à un appelant : plafonne un usage global (appels à une API
 * facturée, par exemple). Même mécanique, sans empreinte d'IP.
 */
export async function quotaGlobal(
  nom: string,
  limite: number,
  fenetreSecondes: number,
): Promise<boolean> {
  if (!supabaseConfigured()) return true

  const { data, error } = await supabaseAdmin().rpc('consommer_quota', {
    p_cle: `global:${nom}`,
    p_limite: limite,
    p_fenetre_sec: fenetreSecondes,
  })
  if (error) {
    console.error('quota_indisponible', error.code)
    return true
  }
  return data
}
