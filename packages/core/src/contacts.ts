import { numeroFrancais } from './telephone.ts'

/**
 * G3 — l'import du répertoire.
 *
 * **C'est la pièce qui décide de l'adoption** : la clientèle d'une pro existe
 * déjà dans son téléphone, et la saisie manuelle de cent fiches tue l'adoption
 * avant qu'elle commence.
 *
 * ⚠️ **CE QUI EST RÉELLEMENT FAISABLE EN PWA, dit franchement.**
 *
 * L'API Contact Picker (`navigator.contacts.select`) n'existe que sur **Chrome
 * Android**. **Elle n'existe pas sur iOS**, sur aucun navigateur, Safari
 * compris — iOS n'expose pas le carnet d'adresses au web, et ce n'est pas une
 * question de version. Construire l'import UNIQUEMENT sur cette API, ce serait
 * livrer une fonctionnalité qui marche sur un navigateur sur trois, et
 * précisément pas sur celui d'une large part de la cible.
 *
 * D'où **deux chemins, et le second est le principal** :
 *
 * ① le sélecteur natif quand le navigateur le propose : deux taps, rien à
 *    exporter. C'est le meilleur chemin là où il existe ;
 * ② **l'import d'un fichier**, partout ailleurs, et c'est le chemin qui compte.
 *    Les deux systèmes savent exporter un carnet en vCard ; un tableur exporte
 *    en CSV. Ce module lit les deux.
 *
 * Le troisième chemin reste la **saisie assistée** fiche par fiche, qui existe
 * déjà, et le quatrième est **G6** (le carnet papier photographié), après la
 * bêta. Aucune migration n'est obligatoire : l'app se remplit aussi toute seule
 * au fil des rendez-vous.
 */

export type ContactImporte = {
  prenom: string
  nom?: string
  telephone?: string
  email?: string
}

/**
 * Lit un fichier vCard (`.vcf`), le format d'export des deux systèmes.
 *
 * On ne lit que quatre champs : prénom, nom, téléphone, e-mail. Un carnet
 * contient des anniversaires, des adresses, des photos et des notes ; rien de
 * tout cela n'a de finalité ici, et **une donnée sans finalité ne se collecte
 * pas**. C'est la minimisation appliquée à un import de masse, là où elle est
 * le plus facile à oublier.
 */
export function lireVCard(texte: string): ContactImporte[] {
  const contacts: ContactImporte[] = []
  // Le pliage vCard : une ligne qui commence par une espace continue la
  // précédente. Sans ce dépliage, un nom long arrive coupé en deux.
  const lignes = texte.replace(/\r\n[ \t]/g, '').split(/\r?\n/)

  let courant: ContactImporte | null = null
  for (const ligne of lignes) {
    if (/^BEGIN:VCARD/i.test(ligne)) {
      courant = { prenom: '' }
      continue
    }
    if (/^END:VCARD/i.test(ligne)) {
      if (courant?.prenom) contacts.push(courant)
      courant = null
      continue
    }
    if (!courant) continue

    const separateur = ligne.indexOf(':')
    if (separateur === -1) continue
    const propriete = ligne.slice(0, separateur).toUpperCase()
    const valeur = deseschapper(ligne.slice(separateur + 1).trim())
    if (!valeur) continue

    // `N` est structuré « nom;prénom;… » et fait autorité sur `FN`, qui est un
    // affichage libre où l'on ne sait pas quelle moitié est le prénom.
    if (propriete === 'N' || propriete.startsWith('N;')) {
      const [nom, prenom] = valeur.split(';')
      if (prenom) courant.prenom = prenom.trim()
      if (nom) courant.nom = nom.trim()
    } else if ((propriete === 'FN' || propriete.startsWith('FN;')) && !courant.prenom) {
      const morceaux = valeur.split(/\s+/)
      courant.prenom = morceaux[0]
      if (morceaux.length > 1) courant.nom = morceaux.slice(1).join(' ')
    } else if (propriete.startsWith('TEL') && !courant.telephone) {
      courant.telephone = valeur
    } else if (propriete.startsWith('EMAIL') && !courant.email) {
      courant.email = valeur
    }
  }
  return contacts
}

/**
 * Lit un CSV, en devinant ses colonnes d'après l'en-tête.
 *
 * Les en-têtes varient d'un export à l'autre (« Prénom », « First Name »,
 * « Téléphone », « Phone 1 - Value »…). On reconnaît les formes courantes des
 * deux langues plutôt que d'imposer un gabarit : une pro qui doit renommer des
 * colonnes dans un tableur avant d'importer n'importera pas.
 */
export function lireCsv(texte: string): ContactImporte[] {
  const lignes = decouperLignes(texte).filter((l) => l.some((c) => c.trim() !== ''))
  if (lignes.length < 2) return []

  const entete = lignes[0].map((c) => c.trim().toLowerCase())
  const trouver = (motifs: RegExp) => entete.findIndex((c) => motifs.test(c))
  const iPrenom = trouver(/pr[ée]nom|first\s*name|given/)
  const iNom = trouver(/^nom$|last\s*name|family|surname/)
  const iTel = trouver(/t[ée]l|phone|mobile|portable/)
  const iMail = trouver(/mail/)
  // Sans colonne de prénom, on ne sait pas nommer une fiche, et une fiche sans
  // nom n'est pas une fiche. On préfère ne rien importer qu'importer du vide.
  if (iPrenom === -1) return []

  const contacts: ContactImporte[] = []
  for (const cellules of lignes.slice(1)) {
    const prenom = (cellules[iPrenom] ?? '').trim()
    if (!prenom) continue
    contacts.push({
      prenom,
      nom: iNom === -1 ? undefined : (cellules[iNom] ?? '').trim() || undefined,
      telephone: iTel === -1 ? undefined : (cellules[iTel] ?? '').trim() || undefined,
      email: iMail === -1 ? undefined : (cellules[iMail] ?? '').trim() || undefined,
    })
  }
  return contacts
}

/**
 * Nettoie et dédoublonne une liste importée, contre elle-même et contre
 * l'existant.
 *
 * **Le doublon se juge sur le TÉLÉPHONE normalisé**, jamais sur le nom : deux
 * « Marie » sont deux clientes, et une même Marie enregistrée « Marie » puis
 * « Marie D. » est une seule personne. Sans cette règle, un second import
 * dupliquerait tout le carnet.
 *
 * Un contact **sans téléphone n'est pas écarté** : la pro connaît ses clientes,
 * et une fiche sans numéro reste une fiche. Il est seulement impossible à
 * dédoublonner, et il est marqué comme tel.
 */
export function preparerImport(
  contacts: readonly ContactImporte[],
  telephonesExistants: readonly string[] = [],
): { aCreer: ContactImporte[]; doublons: number; sansTelephone: number } {
  const connus = new Set(telephonesExistants.map((t) => numeroFrancais(t) ?? t).filter(Boolean))
  const aCreer: ContactImporte[] = []
  let doublons = 0
  let sansTelephone = 0

  for (const contact of contacts) {
    const prenom = contact.prenom.trim()
    if (!prenom) continue
    const numero = contact.telephone ? numeroFrancais(contact.telephone) : null
    if (!numero) {
      sansTelephone += 1
      aCreer.push({ ...contact, prenom, telephone: undefined })
      continue
    }
    if (connus.has(numero)) {
      doublons += 1
      continue
    }
    connus.add(numero)
    aCreer.push({ ...contact, prenom, telephone: numero })
  }
  return { aCreer, doublons, sansTelephone }
}

/** Les échappements vCard : `\,` `\;` `\n`. */
function deseschapper(valeur: string): string {
  return valeur.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1')
}

/** Un CSV correct : guillemets, virgules ou points-virgules, sauts de ligne. */
function decouperLignes(texte: string): string[][] {
  const separateur = (texte.split('\n')[0]?.match(/;/g)?.length ?? 0) > 0 ? ';' : ','
  const lignes: string[][] = []
  let cellules: string[] = []
  let cellule = ''
  let entreGuillemets = false

  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i]
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          cellule += '"'
          i += 1
        } else entreGuillemets = false
      } else cellule += c
      continue
    }
    if (c === '"') entreGuillemets = true
    else if (c === separateur) {
      cellules.push(cellule)
      cellule = ''
    } else if (c === '\n') {
      cellules.push(cellule.replace(/\r$/, ''))
      lignes.push(cellules)
      cellules = []
      cellule = ''
    } else cellule += c
  }
  if (cellule || cellules.length > 0) {
    cellules.push(cellule.replace(/\r$/, ''))
    lignes.push(cellules)
  }
  return lignes
}
