import type { Destinataire, Messagerie, ResultatEnvoi } from '@wiggy/core'
import { destinationSmsAutorisee } from '@wiggy/core'
import { messagerieBrevo } from './brevo'

/**
 * Le choix du fournisseur, fait une fois, ici.
 *
 * Le reste du produit appelle `messagerie()` et ne sait rien d'autre. C'est la
 * condition posée par G4 : aucun appel direct à un fournisseur hors de son
 * adaptateur, pour que la revoyure prévue vers 10 000 SMS par mois se règle en
 * une journée.
 *
 * ⚠️ **D14 : le fournisseur par défaut est L'ABSENCE DE FOURNISSEUR**, et ce
 * n'est pas un mode dégradé. Pendant toute la bêta, les rappels partent en
 * e-mail et notification, exactement comme pour une pro en palier 1. C'est ce
 * chemin-là qui tournera pendant des semaines : il est écrit en premier et
 * testé comme le cas normal.
 */

const enDeveloppement = () => process.env.WIGGY_ENV === 'developpement'

/**
 * La messagerie du journal : rien ne part, tout se trace.
 *
 * Elle n'est pas un bouchon de test, c'est **l'implémentation de la bêta**.
 * Elle dit `non-configure` plutôt que `echec` : la nuance compte, l'appelant
 * doit basculer de canal, pas alerter.
 */
const messagerieJournal: Messagerie = {
  nom: 'journal',
  sms() {
    // Aucune donnée personnelle : ni numéro, ni contenu. Savoir qu'un envoi a
    // été demandé suffit à suivre un parcours.
    console.warn('messagerie_non_configuree', 'canal=sms')
    return Promise.resolve({ statut: 'non-configure' })
  },
  email() {
    console.warn('messagerie_non_configuree', 'canal=email')
    return Promise.resolve({ statut: 'non-configure' })
  },
}

/** Le fournisseur du moment. La garde est en liste blanche : une variable absente ferme le passage. */
function messagerie(): Messagerie {
  const cle = process.env.BREVO_API_KEY
  const expediteur = process.env.BREVO_EMAIL_EXPEDITEUR
  if (process.env.MESSAGERIE_FOURNISSEUR === 'brevo' && cle && expediteur) {
    return messagerieBrevo(cle, expediteur)
  }
  return messagerieJournal
}

/**
 * Envoie un SMS, après le garde-fou de destination.
 *
 * D11 ④ : hors du plan français (métropole et DOM), rien ne part. La règle
 * valait déjà pour les codes de vérification ; elle vaut **aussi pour les
 * rappels**, et c'est ici qu'elle est tenue pour tous les appelants à la fois.
 * La fraude au pompage vise des numéros surtaxés à l'étranger : borner la
 * destination l'annule à zéro, quel que soit le plafond.
 */
export async function envoyerSms(a: Destinataire, texte: string): Promise<ResultatEnvoi> {
  if (!a.telephone) return { statut: 'refuse', motif: 'coordonnee-manquante' }
  if (!destinationSmsAutorisee(a.telephone)) {
    console.warn('sms_destination_refusee')
    return { statut: 'refuse', motif: 'destination' }
  }
  return messagerie().sms(a, texte)
}

export async function envoyerEmail(
  a: Destinataire,
  sujet: string,
  texte: string,
): Promise<ResultatEnvoi> {
  return messagerie().email(a, sujet, texte)
}

/** En développement seulement : rend un code lisible quand rien n'est configuré. */
export function codeVisibleEnDeveloppement(code: string): string | undefined {
  return enDeveloppement() ? code : undefined
}
