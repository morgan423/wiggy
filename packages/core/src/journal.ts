/**
 * B14 — le registre des événements journalisables.
 *
 * **Trois niveaux, et un seul n'est pas réglable.**
 *
 * ① **Le journal reçoit TOUT, TOUJOURS**, et ne se désactive pas. C'est un
 *    registre. Un journal qu'on peut couper crée des trous invisibles : la pro
 *    ne sait pas ce qu'elle ne voit pas. Et il n'interrompt personne.
 * ② **Le badge** de la cloche, réglable : ce qui attire l'œil DANS l'app.
 * ③ **Le push**, réglable : ce qui interrompt DANS LA POCHE.
 *
 * Une pro qui coupe tout garde un registre exact. Elle choisit simplement de ne
 * pas être dérangée.
 *
 * ⚠️ **Le journal reçoit des FAITS ACCOMPLIS, au passé, jamais des choses à
 * faire.** Ce qui appelle une action va dans « À décider », le bloc de l'agenda.
 * C'est la distinction de la planche 17a, et elle est la seule chose qui rend
 * les deux endroits utiles : l'un sert à agir, l'autre à savoir.
 */

/**
 * La NATURE d'un événement, dont le défaut de push se déduit.
 *
 * La règle, tranchée le 04/09 : **le push est actif quand l'événement CHANGE
 * L'AGENDA ou ATTEND UNE ACTION, inactif quand il est seulement AGRÉABLE À
 * SAVOIR.** Un avis à cinq étoiles fait plaisir, il n'appelle rien, il n'a pas
 * à interrompre une prestation.
 *
 * Le défaut n'est donc pas SAISI événement par événement, il est CALCULÉ. Un
 * événement futur n'a qu'à déclarer sa nature, et son défaut en découle : c'est
 * ce qui empêche la règle de se perdre au fil des ajouts.
 */
export type NatureEvenement = 'change_agenda' | 'attend_action' | 'agreable_a_savoir'

export type Evenement = {
  /** La clé technique, celle des colonnes `badge_*` et `push_*`. */
  cle: string
  /** Le libellé de l'écran de réglages. */
  libelle: string
  /** Ce que la pro comprend de l'événement, en une ligne. */
  explication: string
  nature: NatureEvenement
  /**
   * `null` quand la fonctionnalité qui produirait cet événement n'existe pas
   * encore. On le DÉCLARE plutôt que de le masquer : un réglage sans émetteur
   * ment moins s'il dit qu'il attend sa fonctionnalité.
   */
  attend: string | null
}

/** Le push est actif par défaut sauf si l'événement est seulement agréable à savoir. */
export function pushParDefaut(nature: NatureEvenement): boolean {
  return nature !== 'agreable_a_savoir'
}

export const EVENEMENTS: readonly Evenement[] = [
  {
    cle: 'nouveau_rdv',
    libelle: 'Nouveau rendez-vous',
    explication: 'Une cliente a réservé un créneau qui est maintenant pris.',
    nature: 'change_agenda',
    attend: null,
  },
  {
    cle: 'demande_a_valider',
    libelle: 'Nouvelle demande',
    explication: 'Une demande est arrivée et attend ta décision dans « À décider ».',
    nature: 'attend_action',
    attend: null,
  },
  {
    cle: 'reponse_cliente',
    libelle: 'Réponse à ta proposition',
    explication: 'Une cliente a répondu au créneau que tu lui as proposé.',
    nature: 'change_agenda',
    attend: null,
  },
  {
    cle: 'annulation',
    libelle: 'Annulation',
    explication: 'Un rendez-vous a été annulé : ta journée a changé.',
    nature: 'change_agenda',
    attend: null,
  },
  {
    cle: 'avis',
    libelle: 'Nouvel avis',
    explication: 'Une cliente a laissé un avis sur sa prestation.',
    nature: 'agreable_a_savoir',
    attend: 'A7',
  },
  {
    cle: 'acompte',
    libelle: 'Acompte reçu',
    explication: 'Un acompte a été encaissé pour un rendez-vous à venir.',
    nature: 'agreable_a_savoir',
    attend: 'B9',
  },
]

/**
 * De quel réglage relève une ligne du journal.
 *
 * Le `kind` stocké en base est plus fin que le réglage : `demande_traitee` est
 * la trace de la décision que la pro vient de prendre, et elle appartient au
 * même flux que la demande qui l'a précédée. Une pro qui fait taire les
 * demandes fait taire tout le flux, pas sa moitié.
 */
export const REGLAGE_DU_KIND: Record<string, string> = {
  nouveau_rdv: 'nouveau_rdv',
  demande_a_valider: 'demande_a_valider',
  demande_traitee: 'demande_a_valider',
  reponse_proposition: 'reponse_cliente',
  annulation: 'annulation',
  avis_recu: 'avis',
  acompte_recu: 'acompte',
}

export function evenement(cle: string): Evenement | undefined {
  return EVENEMENTS.find((e) => e.cle === cle)
}

/** Les événements qu'une fonctionnalité existante peut réellement produire. */
export function evenementsActifs(): readonly Evenement[] {
  return EVENEMENTS.filter((e) => e.attend === null)
}

/**
 * Le badge doit-il compter cet événement, et le push doit-il partir ?
 *
 * ⚠️ Aucune fonction ne demande « faut-il journaliser ». **Le journal reçoit
 * tout, toujours**, et l'absence de cette question est volontaire : la seule
 * façon de garantir qu'un registre n'a pas de trous est de ne jamais offrir le
 * moyen d'en faire un.
 */
export function badgeActif(reglages: Record<string, boolean | null>, cle: string): boolean {
  return reglages[`badge_${cle}`] ?? true
}

export function pushActif(reglages: Record<string, boolean | null>, cle: string): boolean {
  const evt = evenement(cle)
  return reglages[`push_${cle}`] ?? (evt ? pushParDefaut(evt.nature) : false)
}
