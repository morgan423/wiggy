import reservationCliente from '../ecrans/reservation-cliente.json' with { type: 'json' }
import etatsVides from '../ecrans/etats-vides.json' with { type: 'json' }
import agendaTournee from '../ecrans/agenda-tournee.json' with { type: 'json' }
import notificationCopilote from '../ecrans/notification-copilote.json' with { type: 'json' }
import ficheCliente from '../ecrans/fiche-cliente.json' with { type: 'json' }
import demandesPro from '../ecrans/demandes-pro.json' with { type: 'json' }
import validation from '../ecrans/validation.json' with { type: 'json' }

/**
 * Copy deck : la source de vérité du contenu, écran par écran.
 *
 * Même mécanique que les tokens pour le visuel. Le micro-copy du board design
 * est du contenu ratifié, pas une suggestion de rendu : les écrans le
 * reprennent d'ici plutôt que de le réinventer. Les chaînes verbatim du board
 * restent dans `packages/copy/source/`, et un test vérifie que le deck en
 * dérive bien, à la ponctuation près (les cadratins sont filtrés, cf. la règle
 * du projet).
 *
 * Ce qui manque au board est signalé dans `packages/copy/MANQUES.md` : mieux
 * vaut écrire ce contenu que laisser l'improvisation le remplir.
 */
export const copy = {
  reservationCliente,
  etatsVides,
  agendaTournee,
  notificationCopilote,
  ficheCliente,
  demandesPro,
  validation,
} as const

export type CopyDeck = typeof copy

/**
 * Remplit un gabarit : `{pro}`, `{cliente}`, `{quand}`.
 *
 * Une marque laissée sans valeur est une faute visible en production. On lève
 * plutôt que d'afficher « {pro} se déplace chez vous » à une cliente.
 */
export function remplir(gabarit: string, valeurs: Record<string, string | undefined>): string {
  return gabarit.replace(/\{([a-z]+)\}/gi, (_, cle: string) => {
    const valeur = valeurs[cle]
    if (valeur === undefined) throw new Error(`Gabarit incomplet : marque « ${cle} » sans valeur`)
    return valeur
  })
}
