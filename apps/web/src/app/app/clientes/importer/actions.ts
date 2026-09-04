'use server'

import { revalidatePath } from 'next/cache'
import { preparerImport, type ContactImporte } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

/** Au-delà, ce n'est plus un carnet de clientes : on borne plutôt que d'écrire. */
const PLAFOND = 500

/**
 * Crée les fiches, après un DERNIER dédoublonnage contre l'existant.
 *
 * Le navigateur a déjà dédoublonné la liste contre elle-même pour l'aperçu,
 * mais il ne connaît pas les fiches déjà en base — et surtout, **ce qu'un
 * client envoie ne se croit pas**. Sans ce second passage, deux imports
 * successifs créeraient le carnet en double.
 */
export async function importerContacts(contacts: ContactImporte[]): Promise<number> {
  const { pro } = await requirePro()
  if (!Array.isArray(contacts) || contacts.length === 0) return 0
  const supabase = await supabaseServer()

  const { data: existantes } = await supabase.from('clients').select('phone')
  const { aCreer } = preparerImport(
    contacts.slice(0, PLAFOND),
    (existantes ?? []).map((c) => c.phone).filter((p): p is string => p !== null),
  )
  if (aCreer.length === 0) return 0

  const { data, error } = await supabase
    .from('clients')
    .insert(
      aCreer.map((c) => ({
        pro_id: pro.id,
        first_name: c.prenom,
        last_name: c.nom ?? null,
        phone: c.telephone ?? null,
        email: c.email ?? null,
      })),
    )
    .select('id')
  if (error) {
    console.error('import_contacts_failed', error.code)
    return 0
  }

  revalidatePath('/app/clientes')
  return data.length
}
