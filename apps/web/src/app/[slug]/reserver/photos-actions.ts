'use server'

import { randomUUID } from 'node:crypto'
import { validerPhotos, extensionPhoto, estTypePhoto, PHOTOS_MAX } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { quotaDisponible } from '@/lib/quota'
import { DEPOT } from '@/lib/photos'

/**
 * A4 : préparation du dépôt des photos.
 *
 * Les photos ne transitent plus par l'action de réservation. Le serveur se
 * contente de délivrer des URL de téléversement signées, une par fichier, et
 * le navigateur envoie les octets directement au stockage.
 *
 * Ce n'est pas une optimisation, c'est la correction du bloquant B1. Un corps
 * de requête d'action serveur est tronqué au-delà d'une limite de plateforme
 * (10 Mo en développement, moins en production) : le flux multipart arrivait
 * coupé et l'erreur « Unexpected end of form » remontait jusqu'à la cliente,
 * avant même que la moindre validation ait pu s'exécuter.
 *
 * Le seau reste privé et sans politique : c'est le serveur qui autorise, une
 * URL à la fois, sur un chemin qu'il choisit. Exactement comme il délivre déjà
 * l'URL de lecture (décision T18).
 */

const SEAU = 'appointment-photos'
const C = copy.reservationCliente

type Autorisation = { chemin: string; url: string; jeton: string }

export type EtatDepot =
  | { statut: 'ok'; depot: string; autorisations: Autorisation[] }
  | { statut: 'erreur'; message: string }

/** Ce que le navigateur déclare avant d'envoyer quoi que ce soit. */
export type FichierAnnonce = { nom: string; type: string; taille: number; genre: string }

export async function preparerDepotPhotos(fichiers: FichierAnnonce[]): Promise<EtatDepot> {
  if (!supabaseConfigured()) return { statut: 'erreur', message: C.$aEcrire.photosEchec }
  if (fichiers.length === 0) return { statut: 'erreur', message: C.$aEcrire.photosEchec }

  // Le contrôle du navigateur est un confort d'affichage. Celui-ci fait foi :
  // rien n'empêche d'appeler cette action sans passer par l'écran.
  const validation = validerPhotos(fichiers.map((f) => ({ type: f.type, size: f.taille })))
  if (!validation.ok) {
    return {
      statut: 'erreur',
      message: {
        'trop-nombreuses': C.$aEcrire.photosTropNombreuses,
        'trop-lourde': C.$aEcrire.photosTropLourde,
        format: C.$aEcrire.photosFormat,
      }[validation.raison],
    }
  }

  // Un dépôt est ouvert à qui passe sur la page publique : il se plafonne.
  if (!(await quotaDisponible('depot_photos', 30, 900))) {
    return { statut: 'erreur', message: 'Trop de tentatives. Patientez quelques minutes.' }
  }

  const depot = randomUUID()
  const admin = supabaseAdmin()
  const autorisations: Autorisation[] = []

  for (const [rang, fichier] of fichiers.slice(0, PHOTOS_MAX).entries()) {
    if (!estTypePhoto(fichier.type)) continue
    // Le genre de la photo voyage dans le nom : le stockage ne transporte pas
    // de métadonnée que l'on puisse relire à coup sûr après un déplacement.
    const prefixe = fichier.genre === 'actuelle' ? 'actuelle' : 'inspiration'
    const chemin = `${DEPOT}/${depot}/${prefixe}-${rang}.${extensionPhoto(fichier.type)}`
    const { data, error } = await admin.storage.from(SEAU).createSignedUploadUrl(chemin)
    if (error) {
      console.error('depot_url_failed', error.name)
      return { statut: 'erreur', message: C.$aEcrire.photosEchec }
    }
    autorisations.push({ chemin, url: data.signedUrl, jeton: data.token })
  }

  if (autorisations.length === 0) {
    return { statut: 'erreur', message: C.$aEcrire.photosFormat }
  }
  return { statut: 'ok', depot, autorisations }
}
