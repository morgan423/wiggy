'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

/** Marquer tout comme lu. Le seul geste de la cloche : elle sert à savoir. */
export async function marquerToutLu() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('notifications')
    .update({ lu_le: new Date().toISOString() })
    .eq('pro_id', pro.id)
    .is('lu_le', null)
  if (error) console.error('marquer_tout_lu_failed', error.code)
  revalidatePath('/app/notifications')
}
