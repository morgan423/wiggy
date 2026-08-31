'use server'

import { z } from 'zod'
import { cityKey, normalizeCityName } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { quotaDisponible } from '@/lib/quota'
import { champ, champTexte } from '@/lib/forms'

/**
 * A9 — inscription à la liste d'attente d'une ville.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ `city_waitlist` est VERROUILLÉE PAR CONCEPTION : RLS active, aucune    │
 * │ politique. Cette route est le seul chemin d'écriture, et c'est         │
 * │ délibéré — c'est ici que se font la validation de format, le quota par │
 * │ appelant et le piège anti-robot. Une politique INSERT pour `anon`      │
 * │ rendrait la table écrivable directement via PostgREST avec la clé      │
 * │ anonyme (publique), en contournant les trois. Voir migration 0005.     │
 * └───────────────────────────────────────────────────────────────────────┘
 */

const Inscription = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, 'Cette adresse e-mail est trop longue.')
    .pipe(z.email('Cette adresse e-mail semble incomplète.')),
  ville: z.string().trim().min(1, 'Indiquez votre ville.').max(120),
  // Seule donnée « numérique » collectée ici : le code INSEE de la commune,
  // au format à cinq caractères (2A/2B pour la Corse). Aucun numéro de
  // téléphone n'est demandé sur cet écran.
  codeInsee: z
    .string()
    .trim()
    .regex(/^[0-9AB]{5}$/i, 'Code commune invalide.')
    .optional()
    .nullable(),
})

export type EtatInscription = { statut: 'vide' | 'ok' | 'erreur'; message?: string }

const CONFIRMATION = (ville: string) =>
  `C’est noté. Nous vous préviendrons dès qu’un professionnel s’installe à ${ville}.`

export async function rejoindreListeAttente(
  _precedent: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  // Piège anti-robot : un champ invisible et hors tabulation, qu'une visiteuse
  // ne peut pas remplir mais qu'un robot d'auto-remplissage complète. On répond
  // comme si tout s'était bien passé — inutile de lui apprendre qu'il est
  // repéré — mais rien n'est enregistré.
  if (champTexte(donnees, 'site_web').trim() !== '') {
    const ville = normalizeCityName(champTexte(donnees, 'ville'))
    return { statut: 'ok', message: CONFIRMATION(ville) }
  }

  const saisie = Inscription.safeParse({
    email: champ(donnees, 'email'),
    ville: champ(donnees, 'ville'),
    codeInsee: champ(donnees, 'codeInsee'),
  })
  if (!saisie.success) {
    return { statut: 'erreur', message: saisie.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  if (!supabaseConfigured()) {
    // Vaut mieux le dire que faire semblant d'avoir enregistré.
    return {
      statut: 'erreur',
      message: 'Le service est momentanément indisponible. Réessayez dans un instant.',
    }
  }

  // 5 dépôts par quart d'heure et par appelant : large pour un usage normal,
  // étroit pour un script.
  if (!(await quotaDisponible('liste-attente', 5, 900))) {
    return {
      statut: 'erreur',
      message: 'Trop de demandes envoyées. Patientez quelques minutes avant de réessayer.',
    }
  }

  const { email, ville, codeInsee } = saisie.data
  const villeAffichee = normalizeCityName(ville)

  const { error } = await supabaseAdmin()
    .from('city_waitlist')
    .insert({
      email,
      city_key: cityKey(ville, codeInsee),
      city_name: villeAffichee,
      insee_code: codeInsee,
    })

  if (error) {
    // 23505 : déjà inscrite pour cette ville. Ce n'en est pas une pour elle.
    // 54000 : plafond horaire par adresse (déclencheur en base).
    if (error.code === '23505') return { statut: 'ok', message: CONFIRMATION(villeAffichee) }
    if (error.code === '54000') {
      return {
        statut: 'erreur',
        message: 'Trop de demandes pour cette adresse. Réessayez plus tard.',
      }
    }
    // Pas de donnée personnelle dans les logs : le code, jamais l'adresse.
    console.error('waitlist_insert_failed', error.code)
    return { statut: 'erreur', message: 'Nous n’avons pas pu enregistrer votre demande.' }
  }

  return { statut: 'ok', message: CONFIRMATION(villeAffichee) }
}
