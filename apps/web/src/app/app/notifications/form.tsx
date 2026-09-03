'use client'

import { copy } from '@wiggy/copy'
import { marquerToutLu } from './actions'

/** Le seul geste de la cloche : marquer comme lu. Aucune décision ici. */
export function ToutMarquerLu() {
  return (
    <form action={marquerToutLu}>
      <button
        type="submit"
        className="tactile w-full text-[12px] font-bold text-texte-secondaire hover:text-prune"
      >
        {copy.notificationCopilote.cloche.toutLu}
      </button>
    </form>
  )
}
