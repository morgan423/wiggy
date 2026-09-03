import type { Destinataire, Messagerie, ResultatEnvoi } from '@wiggy/core'

/**
 * **Le seul fichier du dépôt qui connaît Brevo.**
 *
 * Retenu en G4 pour les deux canaux, SMS et e-mail transactionnel. Une revoyure
 * est déjà programmée vers 10 000 SMS par mois : la bascule vers un concurrent
 * doit coûter une journée. Elle coûtera donc l'écriture d'un fichier voisin et
 * une ligne de configuration, jamais une refonte, parce que rien d'autre ici
 * ne sait que ce nom existe.
 *
 * La clé ne quitte jamais le serveur. L'app native n'appelle pas Brevo
 * directement : elle passe par nos routes, ce qui permet aussi de compter et de
 * plafonner l'usage.
 *
 * ⚠️ D14 : ce fichier ne tournera pas avant plusieurs semaines. La bêta tourne
 * SANS SMS de service, et c'est le comportement normal. Il existe pour que le
 * jour où la clé arrive, il ne reste qu'à l'écrire dans `.env.local`.
 */

const BASE = 'https://api.brevo.com/v3'

/** G4 : l'expéditeur est « Wiggy », sender ID alphanumérique unique. */
const EXPEDITEUR = 'Wiggy'

/** Au-delà, le fournisseur est considéré injoignable : on ne fait pas attendre. */
const DELAI_MS = 8_000

async function appeler(
  cle: string,
  chemin: string,
  corps: Record<string, unknown>,
): Promise<ResultatEnvoi> {
  try {
    const reponse = await fetch(`${BASE}${chemin}`, {
      method: 'POST',
      headers: { 'api-key': cle, 'content-type': 'application/json' },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(DELAI_MS),
    })
    if (!reponse.ok) {
      // Le corps de la réponse peut contenir le destinataire : on ne journalise
      // que le code.
      console.error('brevo_refus', chemin, reponse.status)
      return { statut: 'echec' }
    }
    const donnees = (await reponse.json()) as { messageId?: string | number }
    return {
      statut: 'envoye',
      reference: donnees.messageId === undefined ? undefined : String(donnees.messageId),
    }
  } catch (e) {
    console.error('brevo_injoignable', chemin, e instanceof Error ? e.name : 'inconnu')
    return { statut: 'echec' }
  }
}

export function messagerieBrevo(cle: string, expediteurEmail: string): Messagerie {
  return {
    nom: 'brevo',

    async sms(a: Destinataire, texte: string) {
      if (!a.telephone) return { statut: 'refuse', motif: 'coordonnee-manquante' }
      return appeler(cle, '/transactionalSMS/sms', {
        sender: EXPEDITEUR,
        recipient: a.telephone.replace(/^0/, '33').replace(/^\+/, ''),
        content: texte,
        type: 'transactional',
      })
    },

    async email(a: Destinataire, sujet: string, texte: string) {
      if (!a.email) return { statut: 'refuse', motif: 'coordonnee-manquante' }
      return appeler(cle, '/smtp/email', {
        sender: { name: EXPEDITEUR, email: expediteurEmail },
        to: [{ email: a.email }],
        subject: sujet,
        textContent: texte,
      })
    },
  }
}
