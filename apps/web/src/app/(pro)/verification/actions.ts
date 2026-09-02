'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { creerEtEnvoyerCode, verifierCode, normaliserNumero } from '@/lib/sms/codes'
import { piegeDeclenche } from '@/lib/sms/plafonds'
import { champ } from '@/lib/forms'

/**
 * D9 : la vérification du téléphone du pro.
 *
 * Les plafonds anti-pompage sont éprouvés dans `creerEtEnvoyerCode`, avant
 * toute génération de code. Le piège anti-robot est ici, au plus près du
 * formulaire : rempli, on répond comme si tout s'était bien passé, et rien ne
 * part. Inutile d'apprendre au robot qu'il est repéré.
 */

const V = copy.validation.$aEcrire

const Numero = z
  .string()
  .trim()
  .regex(/^(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/, V.telephone)

export type EtatVerif =
  | { statut: 'vide' }
  | { statut: 'erreur'; message: string; saisie?: string }
  | { statut: 'envoye'; numero: string; codeDeDeveloppement?: string }
  | { statut: 'verifie' }

const MESSAGES_PLAFOND = {
  destination: V.proDestinationSms,
  numero: V.proPlafondNumero,
  appelant: V.proPlafondAppelant,
  global: V.proPlafondGlobal,
}

export async function envoyerCodeTelephone(
  _precedent: EtatVerif,
  donnees: FormData,
): Promise<EtatVerif> {
  const { pro } = await requirePro()
  const saisi = champ(donnees, 'telephone') ?? ''

  // Le piège d'abord : inutile de faire travailler les compteurs pour un robot.
  if (piegeDeclenche(champ(donnees, 'site_web'))) {
    return { statut: 'envoye', numero: normaliserNumero(saisi) }
  }

  const numero = Numero.safeParse(saisi)
  if (!numero.success) {
    return { statut: 'erreur', message: numero.error.issues[0].message, saisie: saisi }
  }

  const envoi = await creerEtEnvoyerCode({
    numero: numero.data,
    proId: pro.id,
    usage: 'verification',
  })
  if (envoi.statut === 'plafond') {
    return { statut: 'erreur', message: MESSAGES_PLAFOND[envoi.raison], saisie: saisi }
  }
  if (envoi.statut === 'indisponible') {
    return { statut: 'erreur', message: V.proSmsIndisponible, saisie: saisi }
  }

  // Le numéro est enregistré, pas encore vérifié : c'est le code qui le
  // vérifiera. L'enregistrer maintenant permet de le réafficher et de le
  // corriger sans le retaper.
  const supabase = await supabaseServer()
  await supabase
    .from('pros')
    .update({ phone: normaliserNumero(numero.data) })
    .eq('id', pro.id)

  return {
    statut: 'envoye',
    numero: normaliserNumero(numero.data),
    codeDeDeveloppement: envoi.codeDeDeveloppement,
  }
}

export async function controlerCodeTelephone(
  _precedent: EtatVerif,
  donnees: FormData,
): Promise<EtatVerif> {
  const { pro } = await requirePro()
  const numero = champ(donnees, 'numero') ?? ''
  const code = champ(donnees, 'code') ?? ''

  const verdict = await verifierCode({ numero, code, usage: 'verification' })
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

  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('pros')
    .update({ phone: normaliserNumero(numero), phone_verified_at: new Date().toISOString() })
    .eq('id', pro.id)
  if (error) {
    console.error('verif_telephone_failed', error.code)
    return { statut: 'erreur', message: V.proSmsIndisponible }
  }

  revalidatePath('/app/parametrage')
  return { statut: 'verifie' }
}

/** Renvoie l'e-mail de confirmation. Aucun SMS ne part, donc aucun plafond SMS. */
export async function renvoyerEmail(): Promise<void> {
  const supabase = await supabaseServer()
  const { data } = await supabase.auth.getUser()
  if (!data.user?.email) return
  await supabase.auth.resend({ type: 'signup', email: data.user.email })
}
