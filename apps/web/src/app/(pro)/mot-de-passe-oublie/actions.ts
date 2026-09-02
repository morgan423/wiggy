'use server'

import { z } from 'zod'
import { copy } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { creerEtEnvoyerCode, verifierCode, normaliserNumero } from '@/lib/sms/codes'
import { piegeDeclenche } from '@/lib/sms/plafonds'
import { champ } from '@/lib/forms'

/**
 * D9 : la récupération de mot de passe, par le téléphone vérifié.
 *
 * Jamais par e-mail : une boîte compromise ne doit pas suffire à prendre un
 * compte, et le téléphone est déjà vérifié pour d'autres raisons. Le trou
 * signalé le 31/08, l'absence totale de récupération, se referme ici.
 *
 * Cet écran est atteignable SANS ÊTRE CONNECTÉ : c'est exactement la cible de
 * la fraude au pompage. Les trois plafonds s'appliquent, et le piège anti-robot
 * précède tout le reste.
 *
 * On ne révèle jamais si un compte existe. Une adresse inconnue reçoit la même
 * réponse qu'une adresse connue : sinon cet écran devient un annuaire des
 * comptes Wiggy.
 */

const V = copy.validation.$aEcrire

export type EtatOubli =
  | { statut: 'vide' }
  | { statut: 'erreur'; message: string }
  /** Toujours renvoyé, que le compte existe ou non. */
  | { statut: 'code-envoye'; codeDeDeveloppement?: string }
  | { statut: 'change' }

const MESSAGES_PLAFOND = {
  numero: V.proPlafondNumero,
  appelant: V.proPlafondAppelant,
  global: V.proPlafondGlobal,
}

export async function demanderCode(_precedent: EtatOubli, donnees: FormData): Promise<EtatOubli> {
  if (piegeDeclenche(champ(donnees, 'site_web'))) return { statut: 'code-envoye' }

  const email = z.email().safeParse(champ(donnees, 'email'))
  if (!email.success) return { statut: 'erreur', message: V.email }
  if (!supabaseConfigured()) return { statut: 'erreur', message: V.proSmsIndisponible }

  // Le compte est cherché en service role : la table `pros` n'expose pas
  // l'e-mail, qui vit dans `auth.users`.
  const admin = supabaseAdmin()
  const { data: comptes } = await admin.auth.admin.listUsers()
  const compte = comptes.users.find((u) => u.email?.toLowerCase() === email.data.toLowerCase())

  const { data: fiche } = compte
    ? await admin.from('pros').select('phone, phone_verified_at').eq('id', compte.id).maybeSingle()
    : { data: null }

  // Compte inconnu, ou téléphone non vérifié : même réponse, aucun SMS. Dire
  // « ce compte n'a pas de téléphone vérifié » renseignerait sur son existence.
  if (!fiche?.phone || !fiche.phone_verified_at) return { statut: 'code-envoye' }

  const envoi = await creerEtEnvoyerCode({
    numero: fiche.phone,
    proId: compte?.id,
    usage: 'recuperation',
  })
  if (envoi.statut === 'plafond') {
    return { statut: 'erreur', message: MESSAGES_PLAFOND[envoi.raison] }
  }
  if (envoi.statut === 'indisponible') {
    return { statut: 'erreur', message: V.proSmsIndisponible }
  }
  return { statut: 'code-envoye', codeDeDeveloppement: envoi.codeDeDeveloppement }
}

export async function changerMotDePasse(
  _precedent: EtatOubli,
  donnees: FormData,
): Promise<EtatOubli> {
  const email = z.email().safeParse(champ(donnees, 'email'))
  const motDePasse = z.string().min(8, V.proMotDePasseCourt).safeParse(champ(donnees, 'motDePasse'))
  if (!email.success) return { statut: 'erreur', message: V.email }
  if (!motDePasse.success) {
    return { statut: 'erreur', message: motDePasse.error.issues[0].message }
  }
  if (!supabaseConfigured()) return { statut: 'erreur', message: V.proSmsIndisponible }

  const admin = supabaseAdmin()
  const { data: comptes } = await admin.auth.admin.listUsers()
  const compte = comptes.users.find((u) => u.email?.toLowerCase() === email.data.toLowerCase())
  if (!compte) return { statut: 'erreur', message: V.proCodeFaux }

  const { data: fiche } = await admin.from('pros').select('phone').eq('id', compte.id).maybeSingle()
  if (!fiche?.phone) return { statut: 'erreur', message: V.proCodeFaux }

  const verdict = await verifierCode({
    numero: normaliserNumero(fiche.phone),
    code: champ(donnees, 'code') ?? '',
    usage: 'recuperation',
  })
  if (verdict !== 'ok') {
    return {
      statut: 'erreur',
      message: {
        faux: V.proCodeFaux,
        expire: V.proCodeExpire,
        'trop-de-tentatives': V.proCodeTropDeTentatives,
        indisponible: V.proSmsIndisponible,
      }[verdict],
    }
  }

  const { error } = await admin.auth.admin.updateUserById(compte.id, {
    password: motDePasse.data,
  })
  if (error) {
    console.error('changement_mot_de_passe_failed', error.code)
    return { statut: 'erreur', message: V.proSmsIndisponible }
  }
  return { statut: 'change' }
}
