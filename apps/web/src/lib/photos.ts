import { PHOTOS_MAX } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

const C = copy.reservationCliente

/**
 * A4 : les photos d'un rendez-vous, prêtes à afficher.
 *
 * Le seau est privé et n'a aucune politique : personne ne l'atteint
 * directement. On délivre ici des URL signées à durée courte, et seulement
 * après que l'appelant a lu le rendez-vous avec les droits du pro connecté.
 * C'est cette lecture, soumise à la RLS, qui prouve l'appartenance.
 */

const SEAU = 'appointment-photos'

/**
 * Préfixe du dépôt temporaire.
 *
 * Les photos se téléversent **avant** que le rendez-vous existe : leur chemin
 * ne peut donc pas être indexé sur son identifiant. Elles atterrissent sous un
 * jeton aléatoire, et la réservation les déplace une fois le rendez-vous créé.
 * Ce qui n'est jamais réclamé est purgé par `npm run photos:purge`.
 */
export const DEPOT = 'depots'

/** Assez pour consulter la fiche, trop court pour partager le lien. */
const VALIDITE_S = 10 * 60

export type PhotoAffichable = {
  url: string
  kind: 'current' | 'inspiration'
}

export async function photosDuRendezVous(rdvId: string): Promise<PhotoAffichable[]> {
  if (!supabaseConfigured()) return []
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('appointment_photos')
    .select('storage_path, kind')
    .eq('appointment_id', rdvId)
    .order('created_at')
  if (error) {
    console.error('photos_lecture_failed', error.code)
    return []
  }
  if (data.length === 0) return []

  const { data: signees, error: erreurSignature } = await admin.storage.from(SEAU).createSignedUrls(
    data.map((p) => p.storage_path),
    VALIDITE_S,
  )
  if (erreurSignature) {
    console.error('photos_signature_failed', erreurSignature.name)
    return []
  }

  // `createSignedUrls` renvoie une entrée par chemin, dans le même ordre, avec
  // une erreur par ligne : un fichier disparu du seau ne doit pas faire tomber
  // l'affichage des autres.
  return signees.flatMap((signee, i) => {
    if (signee.error !== null || signee.signedUrl === null) return []
    const kind = data[i].kind === 'current' ? 'current' : 'inspiration'
    return [{ url: signee.signedUrl, kind }]
  })
}

/**
 * A4 : rattache un dépôt temporaire au rendez-vous qui vient de naître.
 *
 * Les fichiers sont **déplacés**, pas recopiés : un dépôt rattaché cesse
 * d'exister en tant que dépôt, et la purge des orphelins ne peut donc pas
 * effacer des photos qui appartiennent désormais à un rendez-vous.
 *
 * Un échec ici ne défait pas la réservation. Perdre une photo est ennuyeux ;
 * perdre le rendez-vous parce qu'une photo n'est pas passée serait absurde.
 */
export async function rattacherPhotos(
  depot: string | null | undefined,
  proId: string,
  rdvId: string,
): Promise<string | undefined> {
  if (!depot || !supabaseConfigured()) return undefined
  const admin = supabaseAdmin()

  const { data: fichiers, error } = await admin.storage
    .from(SEAU)
    .list(`${DEPOT}/${depot}`, { limit: PHOTOS_MAX })
  if (error) {
    console.error('photos_depot_illisible', error.name, error.message)
    return C.$aEcrire.photosPerdues
  }
  if (fichiers.length === 0) return undefined

  let rattachees = 0
  for (const fichier of fichiers) {
    const source = `${DEPOT}/${depot}/${fichier.name}`
    const cible = `${proId}/${rdvId}/${fichier.name}`
    const { error: erreurDeplacement } = await admin.storage.from(SEAU).move(source, cible)
    if (erreurDeplacement) {
      console.error('photo_deplacement_failed', erreurDeplacement.name)
      continue
    }
    // `current` = les cheveux au naturel, `inspiration` = le modèle voulu. Le
    // navigateur encode le genre dans le nom, faute de métadonnée portable.
    const kind = fichier.name.startsWith('actuelle') ? 'current' : 'inspiration'
    const { error: erreurLigne } = await admin
      .from('appointment_photos')
      .insert({ appointment_id: rdvId, storage_path: cible, kind })
    if (erreurLigne) console.error('photo_ligne_failed', erreurLigne.code)
    else rattachees++
  }

  return rattachees === fichiers.length ? undefined : C.$aEcrire.photosPerdues
}
