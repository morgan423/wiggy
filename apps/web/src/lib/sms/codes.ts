import { createHash, randomInt } from 'node:crypto'
import { numeroFrancais } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { plafondEnvoiCode, type RefusPlafond } from './plafonds'
import { envoyerCode } from './index'

/**
 * Les codes de vérification par SMS : génération, envoi, contrôle.
 *
 * Le code n'est JAMAIS stocké en clair. Une fuite de `phone_verifications` ne
 * doit pas permettre de prendre la main sur un compte, et un code à cinq
 * chiffres se lit d'un coup d'œil dans une sauvegarde.
 *
 * La table est verrouillée par conception : tout passe par ici, en service
 * role, et les plafonds anti-pompage sont éprouvés AVANT la génération.
 *
 * La normalisation vient du domaine (`numeroFrancais`), la même que celle qui
 * borne les destinations : deux normalisations qui divergent laisseraient un
 * numéro compté d'un côté et envoyé de l'autre.
 */

/** Ramène au format national. Le refus de destination est traité en amont. */
export function normaliserNumero(saisie: string): string {
  return numeroFrancais(saisie) ?? saisie.replace(/\D/g, '')
}

/** Cinq chiffres : la spécification vérifie automatiquement au cinquième. */
const LONGUEUR = 5

/** Assez pour aller chercher son téléphone, trop court pour être rejoué. */
const VALIDITE_MIN = 10

/** Un code à cinq chiffres se devine si on laisse essayer. */
const TENTATIVES_MAX = 5

export type Usage = 'verification' | 'recuperation'

function empreinte(code: string): string {
  const sel = process.env.RATE_LIMIT_SALT ?? ''
  return createHash('sha256').update(`${sel}:code:${code}`).digest('hex')
}

export type EnvoiCode =
  | { statut: 'envoye'; codeDeDeveloppement?: string }
  | { statut: 'plafond'; raison: Exclude<RefusPlafond, null> }
  | { statut: 'indisponible' }

/**
 * Génère un code, l'enregistre haché, et le fait partir.
 *
 * Les plafonds passent en premier : générer puis refuser aurait laissé une
 * ligne en base pour chaque tentative de pompage, et c'est exactement ce que
 * l'attaquant cherche à faire grossir.
 */
export async function creerEtEnvoyerCode(options: {
  numero: string
  proId?: string
  usage?: Usage
}): Promise<EnvoiCode> {
  if (!supabaseConfigured()) return { statut: 'indisponible' }
  const numero = normaliserNumero(options.numero)

  const refus = await plafondEnvoiCode(numero)
  if (refus) return { statut: 'plafond', raison: refus }

  const code = String(randomInt(0, 10 ** LONGUEUR)).padStart(LONGUEUR, '0')
  const { error } = await supabaseAdmin()
    .from('phone_verifications')
    .insert({
      pro_id: options.proId ?? null,
      phone: numero,
      code_hash: empreinte(code),
      usage: options.usage ?? 'verification',
      expires_at: new Date(Date.now() + VALIDITE_MIN * 60_000).toISOString(),
    })
  if (error) {
    console.error('code_enregistrement_failed', error.code)
    return { statut: 'indisponible' }
  }

  const envoi = await envoyerCode(numero, code)
  if (envoi.statut === 'echec') return { statut: 'indisponible' }
  return {
    statut: 'envoye',
    codeDeDeveloppement: envoi.statut === 'non-configure' ? envoi.codeDeDeveloppement : undefined,
  }
}

export type VerdictCode = 'ok' | 'faux' | 'expire' | 'trop-de-tentatives' | 'indisponible'

/**
 * Contrôle un code, et le consomme s'il est bon.
 *
 * Un code consommé ne vaut plus rien : sans cela, un code intercepté resterait
 * utilisable jusqu'à son expiration.
 */
export async function verifierCode(options: {
  numero: string
  code: string
  usage?: Usage
}): Promise<VerdictCode> {
  if (!supabaseConfigured()) return 'indisponible'
  const numero = normaliserNumero(options.numero)
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('phone_verifications')
    .select('id, code_hash, expires_at, attempts')
    .eq('phone', numero)
    .eq('usage', options.usage ?? 'verification')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) {
    console.error('code_lecture_failed', error.code)
    return 'indisponible'
  }
  if (data.length === 0) return 'expire'
  const ligne = data[0]
  if (ligne.attempts >= TENTATIVES_MAX) return 'trop-de-tentatives'
  if (new Date(ligne.expires_at).getTime() < Date.now()) return 'expire'

  if (ligne.code_hash !== empreinte(options.code.replace(/\D/g, ''))) {
    await admin
      .from('phone_verifications')
      .update({ attempts: ligne.attempts + 1 })
      .eq('id', ligne.id)
    return 'faux'
  }

  await admin
    .from('phone_verifications')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', ligne.id)
  return 'ok'
}
