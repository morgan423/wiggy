import {
  analyserResultatsBan,
  type AdresseSaisie,
  type AdresseTrouvee,
  type SuggestionAdresse,
} from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

/**
 * Géocodage via l'API Adresse de l'État (BAN) : officielle, gratuite, sans clé.
 *
 * La validation vit dans le domaine, pas ici : c'est elle qui empêche
 * d'envoyer le pro à la mauvaise adresse, et elle doit être testable sans
 * réseau.
 *
 * Quand elle refuse, on ne renvoie pas un mur : les candidats écartés
 * remontent en suggestions, pour que l'écran propose une correction. Une
 * validation stricte sans porte de sortie ferait abandonner des clientes qui
 * ont simplement mal tapé leur rue.
 */

/**
 * Détail d'une erreur réseau, en une chaîne sûre.
 *
 * Le nom seul ne suffit pas à diagnostiquer : « TimeoutError » sans le message
 * ni la cause a coûté une session entière sur le bloquant B2. Rien de
 * personnel n'est journalisé ici : ni l'adresse saisie, ni le nom, ni le
 * téléphone. Le refus lui-même est tracé en base, pas dans les journaux.
 */
function detailErreur(e: unknown): string {
  if (!(e instanceof Error)) return 'inconnue'
  const cause = e.cause instanceof Error ? ` (${e.cause.name}: ${e.cause.message})` : ''
  return `${e.name}: ${e.message}${cause}`
}

const RACINE = 'https://api-adresse.data.gouv.fr/search/'
const DELAI_MS = 5000

export type Origine = 'reservation' | 'rdv_manuel'

export type ResultatGeocodage = {
  trouve: AdresseTrouvee | null
  suggestions: SuggestionAdresse[]
  /** Vrai si le service lui-même n'a pas répondu, à distinguer d'un refus. */
  injoignable: boolean
}

export async function geocoder(
  saisie: AdresseSaisie,
  origine: Origine,
): Promise<ResultatGeocodage> {
  const requete = [saisie.ligne1, saisie.ville].filter(Boolean).join(' ').trim()
  if (requete.length < 3) return { trouve: null, suggestions: [], injoignable: false }

  const url = new URL(RACINE)
  url.searchParams.set('q', requete)
  url.searchParams.set('limit', '8')
  // Filtre le plus discriminant : deux communes peuvent porter le même nom de
  // rue, jamais avec le même code postal.
  if (saisie.codePostal) url.searchParams.set('postcode', saisie.codePostal)

  let features: unknown[] = []
  try {
    const reponse = await fetch(url, {
      signal: AbortSignal.timeout(DELAI_MS),
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!reponse.ok) {
      console.error('ban_http', reponse.status, reponse.statusText)
      return { trouve: null, suggestions: [], injoignable: true }
    }
    const brut: unknown = await reponse.json()
    const enveloppe =
      typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : {}
    features = Array.isArray(enveloppe.features) ? enveloppe.features : []
  } catch (e) {
    // Le nom seul ne suffit pas à diagnostiquer : « TimeoutError » sans le
    // message ni la cause a coûté une session entière sur le bloquant B2.
    // Rien de personnel n'est journalisé : ni l'adresse saisie, ni le nom, ni
    // le téléphone. Le refus lui-même est tracé en base, pas ici.
    console.error('ban_injoignable', detailErreur(e))
    return { trouve: null, suggestions: [], injoignable: true }
  }

  const analyse = analyserResultatsBan(features, saisie)
  if (!analyse.retenu) await journaliserRefus(saisie, analyse.suggestions, origine)
  return { trouve: analyse.retenu, suggestions: analyse.suggestions, injoignable: false }
}

/**
 * Enregistre un refus pour pouvoir mesurer les faux négatifs.
 *
 * En base et non dans les journaux applicatifs : c'est purgeable, auditable,
 * et ça n'expédie pas d'adresse chez un agrégateur de logs tiers. On
 * n'enregistre ni nom, ni téléphone, ni e-mail : la saisie d'adresse et les
 * candidats suffisent au diagnostic.
 */
async function journaliserRefus(
  saisie: AdresseSaisie,
  suggestions: SuggestionAdresse[],
  origine: Origine,
): Promise<void> {
  if (!supabaseConfigured()) return
  const { error } = await supabaseAdmin()
    .from('geocodage_refus')
    .insert({
      requete: saisie.ligne1.slice(0, 200),
      code_postal: saisie.codePostal ?? null,
      ville: saisie.ville ?? null,
      candidats: suggestions.map((s) => ({
        libelle: s.libelle,
        codePostal: s.codePostal,
        score: Number(s.score.toFixed(3)),
      })),
      origine,
    })
  // Un moniteur en panne ne doit pas empêcher une réservation.
  if (error) console.error('geocodage_refus_non_journalise', error.code)
}

/**
 * B12 — la recherche d'adresses au fil de la frappe.
 *
 * Elle sert la saisie assistée, qui porte déjà les trois précautions conçues
 * pour une source distante : délai avant appel, annulation des requêtes
 * dépassées, chemin gracieux. Ici on ajoute la quatrième, qui appartient à
 * l'appel lui-même : **une échéance courte**. Une source qui met huit secondes
 * à répondre a déjà perdu : la cliente a fini de taper depuis longtemps.
 *
 * Le nombre de résultats est borné : une liste de quinze adresses ne se lit
 * pas au doigt sur un téléphone.
 */
export type SuggestionSaisie = {
  libelle: string
  codePostal: string | null
  ville: string | null
  lat: number | null
  lng: number | null
}

const ECHEANCE_MS = 4_000
const MAXIMUM_SUGGESTIONS = 5

export async function chercherAdresses(
  terme: string,
  signal?: AbortSignal,
): Promise<SuggestionSaisie[]> {
  if (terme.trim().length < 3) return []
  const url = new URL(RACINE)
  url.searchParams.set('q', terme)
  url.searchParams.set('limit', String(MAXIMUM_SUGGESTIONS))
  // On ne cherche que des adresses : une commune seule ne se réserve pas.
  url.searchParams.set('type', 'housenumber')

  try {
    const reponse = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(ECHEANCE_MS),
      headers: { accept: 'application/json' },
    })
    if (!reponse.ok) {
      console.warn('ban_recherche_refus', reponse.status)
      return []
    }
    const donnees = (await reponse.json()) as {
      features?: {
        properties?: { label?: string; postcode?: string; city?: string }
        geometry?: { coordinates?: [number, number] }
      }[]
    }
    return (donnees.features ?? []).flatMap((f) => {
      const libelle = f.properties?.label
      if (!libelle) return []
      const coord = f.geometry?.coordinates
      return [
        {
          libelle,
          codePostal: f.properties?.postcode ?? null,
          ville: f.properties?.city ?? null,
          // La BAN renvoie [longitude, latitude], dans cet ordre. L'inverser
          // place une adresse de Pau au milieu de l'Atlantique, et un test du
          // domaine existe déjà pour ce piège précis.
          lng: coord ? coord[0] : null,
          lat: coord ? coord[1] : null,
        },
      ]
    })
  } catch (e) {
    // Chemin gracieux : la saisie reste intacte, l'écran propose la saisie
    // libre. On ne bloque jamais quelqu'un parce qu'un service tiers dort.
    console.warn('ban_injoignable', e instanceof Error ? e.name : 'inconnu')
    return []
  }
}
