import {
  versionEnVigueur,
  documentsARedemander,
  type DocumentLegal,
  type PointAcceptation,
} from '@wiggy/core'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * G7 — l'accès aux documents contractuels et l'enregistrement des preuves.
 *
 * La logique — quelle version s'applique, ce qui reste à faire accepter — vit
 * dans `@wiggy/core` (D3). Ce module ne fait que la brancher sur la base.
 *
 * **Rien ici ne connaît un texte.** Les documents sont lus, jamais écrits par
 * l'application : au jalon J2, l'avocat livre ses textes, on insère des lignes
 * dans `legal_documents`, et aucun fichier de ce dépôt ne change.
 */

/** Le jour, en heure de Paris : c'est lui qui décide de la version en vigueur. */
function aujourdHui(): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

async function tousLesDocuments(): Promise<DocumentLegal[]> {
  const { data } = await supabaseAdmin()
    .from('legal_documents')
    .select('slug, version, effective_on, titre, corps')
  return (data ?? []).map((d) => ({
    slug: d.slug,
    version: d.version,
    effectiveOn: d.effective_on,
    titre: d.titre,
    corps: d.corps,
  }))
}

/** Le document en vigueur, ou `null`. Sert aux pages `/legal/<slug>`. */
export async function documentCourant(slug: string): Promise<DocumentLegal | null> {
  return versionEnVigueur(await tousLesDocuments(), slug, aujourdHui())
}

/**
 * Ce qu'un point d'acceptation doit faire accepter maintenant.
 *
 * `dejaAcceptes` est vide pour une visiteuse — elle n'a pas de compte, et
 * chaque réservation redemande son accord, ce qui est la bonne lecture : c'est
 * un contrat par réservation, pas un abonnement.
 */
export async function aFaireAccepter(
  point: PointAcceptation,
  userId?: string,
): Promise<{ slug: string; document: DocumentLegal | null }[]> {
  const documents = await tousLesDocuments()
  let deja: { docSlug: string; docVersion: string }[] = []
  if (userId) {
    const { data } = await supabaseAdmin()
      .from('acceptances')
      .select('doc_slug, doc_version')
      .eq('user_id', userId)
    deja = (data ?? []).map((a) => ({ docSlug: a.doc_slug, docVersion: a.doc_version }))
  }
  return documentsARedemander(point, documents, deja, aujourdHui())
}

/**
 * Enregistre le quadruplé de preuve : compte, document AVEC SA VERSION,
 * horodatage serveur, événement.
 *
 * ⚠️ **`accepted_at` n'est volontairement pas envoyé**, et ne doit jamais
 * l'être : le déclencheur de 0021 l'écrase avec l'heure du serveur. La règle
 * est tenue par la base, pas par ce fichier — mais l'écrire ici serait déjà
 * dire au prochain lecteur que c'est une option.
 *
 * Rend `false` si l'écriture échoue, et l'appelant décide. Une inscription qui
 * réussirait en laissant l'acceptation au sol nous laisserait avec un compte
 * sans preuve, c'est-à-dire exactement ce que G7 existe pour empêcher.
 */
async function enregistrerAcceptation(
  point: PointAcceptation,
  sujet: { userId: string; clientId?: never } | { clientId: string; userId?: never },
  documents: readonly { slug: string; version: string }[],
): Promise<boolean> {
  if (documents.length === 0) {
    // ③ n'a aucun document Wiggy : on trace tout de même l'événement, sinon
    // « l'accord a été recueilli par Stripe » ne serait écrit nulle part.
    return true
  }
  const { error } = await supabaseAdmin()
    .from('acceptances')
    .insert(
      documents.map((d) => ({
        point,
        user_id: sujet.userId ?? null,
        client_id: sujet.clientId ?? null,
        doc_slug: d.slug,
        doc_version: d.version,
      })),
    )
  if (error) {
    console.error('acceptation_non_enregistree', point, error.code)
    return false
  }
  return true
}

/**
 * Vérifie ce qu'un formulaire a réellement coché, et enregistre les preuves.
 *
 * **Le formulaire ne décide de rien.** On relit la version EN VIGUEUR au moment
 * de l'écriture, et on exige une case cochée portant exactement cette
 * version-là. Deux failles se ferment d'un coup :
 *
 * · un formulaire resté ouvert pendant une mise à jour ferait signer l'ancien
 *   texte — la version ne correspond plus, c'est refusé ;
 * · un envoi fabriqué à la main pourrait prétendre avoir accepté n'importe
 *   quoi — il faudrait deviner la version en vigueur, et il aurait alors
 *   simplement accepté le bon document.
 *
 * Rend le motif du refus plutôt qu'un booléen : l'appelant doit pouvoir le dire
 * à la personne, et « c'est refusé » n'aide personne à cocher la case.
 */
export async function verifierEtEnregistrer(
  point: PointAcceptation,
  donnees: FormData,
  sujet: { userId: string; clientId?: never } | { clientId: string; userId?: never },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const aAccepter = await aFaireAccepter(point, sujet.userId)
  const manquants = aAccepter.filter(({ document }) => {
    if (document === null) return true
    return donnees.get(`accepte:${document.slug}:${document.version}`) === null
  })
  if (manquants.length > 0) {
    return {
      ok: false,
      message:
        manquants.length === aAccepter.length && aAccepter.length > 1
          ? 'Il faut accepter les deux documents pour continuer.'
          : 'Il faut accepter ce document pour continuer.',
    }
  }
  const documents = aAccepter
    .map((a) => a.document)
    .filter((d): d is DocumentLegal => d !== null)
    .map((d) => ({ slug: d.slug, version: d.version }))

  return (await enregistrerAcceptation(point, sujet, documents))
    ? { ok: true }
    : { ok: false, message: 'Impossible d’enregistrer ton accord. Réessaie dans un instant.' }
}
