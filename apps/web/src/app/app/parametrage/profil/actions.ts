'use server'

import { revalidatePath } from 'next/cache'
import { ProfilInput, DepartInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm, champ } from '@/lib/forms'
import { geocoder } from '@/lib/adresse'

/** Identité publique du pro (A1) — ce que la cliente voit sur sa page. */

const CHEMIN = '/app/parametrage/profil'

export async function enregistrerProfil(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = ProfilInput.safeParse({
    display_name: champ(donnees, 'display_name'),
    headline: champ(donnees, 'headline'),
    bio: champ(donnees, 'bio'),
    city: champ(donnees, 'city'),
    instagram_url: champ(donnees, 'instagram_url'),
    phone: champ(donnees, 'phone'),
    years_experience: champ(donnees, 'years_experience'),
    pronoun: champ(donnees, 'pronoun'),
  })
  if (!saisie.success) {
    const faute = saisie.error.issues[0]
    return erreur(precedent, faute.message, donnees, String(faute.path[0] ?? ''))
  }

  await requirePro()
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return erreur(precedent, 'Session expirée. Reconnecte-toi.', donnees)

  // On relit la ligne écrite au lieu de supposer qu'elle l'a été. Une mise à
  // jour qui ne touche aucune ligne n'est pas une erreur pour Postgres : sans
  // cette relecture, l'écran annonçait « Profil enregistré. » sur un
  // enregistrement qui n'avait rien enregistré.
  // D10 ① — le mode s'écrit à part, pour la même raison qu'il se lit à part
  // (`lib/mode.ts`) : tant que la migration 0010 n'est pas collée, une mise à
  // jour groupée ferait échouer TOUT l'enregistrement du profil. Sémantique
  // HTML d'une case à cocher : décochée, le champ n'est pas envoyé du tout,
  // c'est donc sa PRÉSENCE qui est la réponse.
  const mode = donnees.get('mode') === null ? 'itinerant' : 'fixe'
  const { error: erreurMode } = await supabase.from('pros').update({ mode }).eq('id', auth.user.id)
  if (erreurMode) {
    console.error('maj_mode_failed', erreurMode.code, 'migration 0010 appliquée ?')
  }

  const { data: enregistre, error } = await supabase
    .from('pros')
    .update(saisie.data)
    .eq('id', auth.user.id)
    .select(
      'display_name, headline, bio, city, instagram_url, phone, years_experience, pronoun, mode',
    )
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_profil_failed', error, donnees)
  if (!enregistre) {
    console.error('maj_profil_sans_effet')
    return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)
  }

  revalidatePath(CHEMIN)
  return ok(precedent, 'Profil enregistré.', enregistre)
}

/**
 * Publication de la page.
 *
 * Arbitrage assumé : on refuse de publier une page sans prestation. Une fiche
 * vide indexée par Google dessert le pro et contredit le principe « aucune
 * donnée fictive ni page creuse en production ». Dépublier reste libre.
 *
 * D9 : la mise en ligne exige EN PLUS que l'e-mail et le téléphone soient
 * vérifiés. Une page publique adossée à un compte non joignable, c'est une
 * cliente qui réserve chez quelqu'un qu'on ne sait pas prévenir.
 */
export async function basculerPublication(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const publierMaintenant = champ(donnees, 'publier') === 'true'
  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  if (publierMaintenant) {
    const { data: auth } = await supabase.auth.getUser()
    const { data: fiche } = await supabase
      .from('pros')
      .select('phone_verified_at')
      .eq('id', pro.id)
      .maybeSingle()
    const manque = [
      auth.user?.email_confirmed_at ? null : 'ton e-mail',
      fiche?.phone_verified_at ? null : 'ton téléphone',
    ].filter((m): m is string => m !== null)
    if (manque.length > 0) {
      return erreur(
        precedent,
        `Il te reste ${manque.join(' et ')} à vérifier pour mettre ta page en ligne.`,
      )
    }

    const { count } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
    if ((count ?? 0) === 0) {
      return erreur(precedent, 'Ajoute au moins une prestation avant de publier ta page.', donnees)
    }
  }

  const { error } = await supabase
    .from('pros')
    .update({ published: publierMaintenant })
    .eq('id', pro.id)
  if (error) return erreurBase(precedent, 'publication_failed', error, donnees)

  revalidatePath(CHEMIN)
  revalidatePath('/app')
  return ok(precedent, publierMaintenant ? 'Ta page est en ligne.' : 'Ta page est hors ligne.')
}

/**
 * D16 — l'adresse de départ de la journée.
 *
 * Géocodée comme toutes les autres, avec la même validation : la BAN place
 * « rue des Lilas, Pau » dans les Landes si on ne la contraint pas.
 *
 * ⚠️ Elle n'est JAMAIS exposée publiquement (principe n°6). Les colonnes ne
 * sont accordées à `anon` nulle part, et cette action est la seule à les
 * écrire.
 */
export async function enregistrerDepart(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = DepartInput.safeParse({
    start_line1: champ(donnees, 'start_line1'),
    start_postal_code: champ(donnees, 'start_postal_code'),
    start_city: champ(donnees, 'start_city'),
  })
  if (!saisie.success) {
    const faute = saisie.error.issues[0]
    return erreur(precedent, faute.message, donnees, String(faute.path[0] ?? ''))
  }

  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  // Vider l'adresse est un geste légitime : la pro retrouve le comportement
  // sans trajet amont, et on ne garde pas des coordonnées orphelines.
  const vide = !saisie.data.start_line1
  let point: { lat: number; lng: number } | null = null
  if (!vide) {
    const trouve = await geocoder(
      {
        ligne1: saisie.data.start_line1 ?? '',
        codePostal: saisie.data.start_postal_code ?? '',
        ville: saisie.data.start_city ?? '',
      },
      'rdv_manuel',
    )
    if (trouve.trouve) point = trouve.trouve.point
  }

  const { data: enregistre, error } = await supabase
    .from('pros')
    .update({
      start_line1: saisie.data.start_line1,
      start_postal_code: saisie.data.start_postal_code,
      start_city: saisie.data.start_city,
      start_lat: point?.lat ?? null,
      start_lng: point?.lng ?? null,
    })
    .eq('id', pro.id)
    .select('start_line1')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_depart_failed', error, donnees)
  if (!enregistre) return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)

  revalidatePath('/app/parametrage/profil')
  revalidatePath('/app/tournee')
  return ok(precedent, 'Point de départ enregistré.', enregistre)
}
