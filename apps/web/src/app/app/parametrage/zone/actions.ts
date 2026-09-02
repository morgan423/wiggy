'use server'

import { revalidatePath } from 'next/cache'
import { CommuneInput } from '@wiggy/api'
import { champ, champTexte, erreur, ok, type EtatForm } from '@/lib/forms'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { chercherCommunes } from '@/lib/communes'

/**
 * B11 ② — zone d'intervention en liste de communes (méthode tranchée).
 *
 * C'est la donnée dont dépendent A3 (créneaux géo-filtrés), A5 (cliente en
 * déplacement), A6 (hors-zone sous réserve) et A8 (forfait distance).
 */

const CHEMIN = '/app/parametrage/zone'

export async function ajouterCommune(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = CommuneInput.safeParse({
    insee_code: champ(donnees, 'insee_code'),
    name: champ(donnees, 'name'),
    postal_code: champ(donnees, 'postal_code'),
    lat: nombreOuNull(champ(donnees, 'lat')),
    lng: nombreOuNull(champ(donnees, 'lng')),
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  // La zone existe dès la première commune : A3 a besoin de savoir en quel mode
  // elle est réglée, même si `communes` est aujourd'hui le seul exposé.
  await supabase.from('service_areas').upsert({ pro_id: pro.id, mode: 'communes' })
  await supabase.from('service_area_communes').upsert({ ...saisie.data, pro_id: pro.id })

  revalidatePath(CHEMIN)
  // `n` change à chaque succès : c'est ce qui remonte le formulaire côté écran
  // et vide le champ de recherche. Sans ça, la commune ajoutée restait
  // affichée comme si elle attendait encore d'être ajoutée.
  return ok(precedent, `${saisie.data.name} est dans ta zone.`)
}

export async function retirerCommune(donnees: FormData) {
  const insee = champTexte(donnees, 'insee_code')
  if (!insee) return
  await requirePro()
  const supabase = await supabaseServer()
  await supabase.from('service_area_communes').delete().eq('insee_code', insee)
  revalidatePath(CHEMIN)
}

function nombreOuNull(valeur: FormDataEntryValue | null): number | null {
  const n = Number(valeur)
  return valeur !== null && valeur !== '' && Number.isFinite(n) ? n : null
}

/**
 * B12 : la source locale de la saisie assistée.
 *
 * Elle lit le référentiel descendu en base (D6). L'écran ne connaît pas la
 * source : il passe cette fonction au composant, qui se charge du délai, de
 * l'annulation et du chemin gracieux. C'est ce qui permettra de brancher la
 * source distante des adresses sans toucher aux écrans.
 */
export async function chercherCommunesAssistee(terme: string) {
  await requirePro()
  const resultats = await chercherCommunes(terme)
  // Le composant distingue « aucun résultat » de « la source ne répond pas » :
  // on lève plutôt que de rendre un tableau vide qui mentirait.
  if (resultats === null) throw new Error('referentiel_communes_indisponible')
  return resultats
}
