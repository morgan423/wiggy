'use server'

import { revalidatePath } from 'next/cache'
import { ProfilInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm, champ } from '@/lib/forms'

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
  const { data: enregistre, error } = await supabase
    .from('pros')
    .update(saisie.data)
    .eq('id', auth.user.id)
    .select('display_name, headline, bio, city, instagram_url, phone, years_experience, pronoun')
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
 */
export async function basculerPublication(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const publierMaintenant = champ(donnees, 'publier') === 'true'
  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  if (publierMaintenant) {
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
