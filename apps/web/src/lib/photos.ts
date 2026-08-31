import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

/**
 * A4 : les photos d'un rendez-vous, prêtes à afficher.
 *
 * Le seau est privé et n'a aucune politique : personne ne l'atteint
 * directement. On délivre ici des URL signées à durée courte, et seulement
 * après que l'appelant a lu le rendez-vous avec les droits du pro connecté.
 * C'est cette lecture, soumise à la RLS, qui prouve l'appartenance.
 */

const SEAU = 'appointment-photos'

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
