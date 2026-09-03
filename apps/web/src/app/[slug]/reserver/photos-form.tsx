'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { copy, remplir } from '@wiggy/copy'
import { validerPhotos, PHOTO_TYPES } from '@wiggy/core'
import { preparerDepotPhotos, type FichierAnnonce } from './photos-actions'

const C = copy.reservationCliente

/**
 * A4 : l'étape des photos, avec son propre bouton de téléversement.
 *
 * Les octets partent d'ici vers le stockage, jamais par l'action serveur : ce
 * chemin-là se faisait tronquer par une limite de plateforme et cassait tout
 * le tunnel (bloquant B1). Le contrôle ci-dessous est un confort d'affichage,
 * la vérité est côté serveur.
 *
 * L'étape est franchissable sans rien envoyer. Une photo est un cadeau que
 * fait la cliente, pas un péage.
 */
export function FormPhotos({
  prenomPro,
  chemin,
  parametres,
}: {
  prenomPro: string
  /**
   * Rien ne traverse la frontière serveur vers client qui ne soit
   * sérialisable. Ce composant recevait auparavant une fonction de
   * construction de lien, et React refusait de rendre la page : le tunnel
   * cassait au choix du créneau, avant même les photos (bloquant R2-2).
   * Il reçoit donc le chemin et les paramètres, et compose lui-même.
   */
  chemin: string
  parametres: Record<string, string>
}) {
  const router = useRouter()

  const lienSuivant = (depot?: string) => {
    const params = new URLSearchParams(parametres)
    params.set('ph', '1')
    if (depot) params.set('d', depot)
    return `${chemin}?${params.toString()}`
  }

  const [actuelles, setActuelles] = useState<File[]>([])
  const [inspirations, setInspirations] = useState<File[]>([])
  const [erreur, setErreur] = useState<string | undefined>()
  const [enCours, setEnCours] = useState(false)

  const toutes = [...actuelles, ...inspirations]

  async function envoyer() {
    setErreur(undefined)
    const verdict = validerPhotos(toutes.map((f) => ({ type: f.type, size: f.size })))
    if (!verdict.ok) {
      setErreur(
        {
          'trop-nombreuses': C.$aEcrire.photosTropNombreuses,
          'trop-lourde': C.$aEcrire.photosTropLourde,
          format: C.$aEcrire.photosFormat,
        }[verdict.raison],
      )
      return
    }

    setEnCours(true)
    const annonces: FichierAnnonce[] = [
      ...actuelles.map((f) => annonce(f, 'actuelle')),
      ...inspirations.map((f) => annonce(f, 'inspiration')),
    ]
    const preparation = await preparerDepotPhotos(annonces)
    if (preparation.statut === 'erreur') {
      setErreur(preparation.message)
      setEnCours(false)
      return
    }

    try {
      // Les octets vont droit au stockage, sur une URL signée par fichier.
      await Promise.all(
        preparation.autorisations.map((autorisation, i) =>
          fetch(autorisation.url, {
            method: 'PUT',
            headers: { 'Content-Type': toutes[i].type },
            body: toutes[i],
          }).then((r) => {
            if (!r.ok) throw new Error(String(r.status))
          }),
        ),
      )
    } catch {
      setErreur(C.$aEcrire.photosEchec)
      setEnCours(false)
      return
    }
    router.push(lienSuivant(preparation.depot))
  }

  return (
    <>
      <h1 className="display mt-6 tracking-tight">{C.$aEcrire.photosEtape}</h1>
      <p className="mt-3 text-texte-secondaire">
        {remplir(C.$aEcrire.photosAideEtape, { pro: prenomPro })}
      </p>
      {/* A4 : une demande de photos SANS motif se lit comme une intrusion ;
          avec son motif, elle se lit comme du soin. */}
      <p className="mt-2 text-texte-secondaire">
        {remplir(C.gabarits.photosRequises, { pro: prenomPro })}
      </p>

      <ChampFichiers
        id="actuelles"
        label={C.$aEcrire.photosActuelles}
        fichiers={actuelles}
        onChange={setActuelles}
      />
      <ChampFichiers
        id="inspirations"
        label={C.$aEcrire.photosInspirations}
        fichiers={inspirations}
        onChange={setInspirations}
      />
      <p className="mt-3 text-sm text-texte-attenue">{C.$aEcrire.photosFormats}</p>

      {erreur ? (
        <p role="alert" className="mt-5 font-semibold text-erreur">
          {erreur}
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={enCours || toutes.length === 0}
          onClick={() => void envoyer()}
          className="tactile w-full rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee disabled:opacity-60"
        >
          {enCours ? C.$aEcrire.photosEnvoi : C.$aEcrire.photosBouton}
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => {
            router.push(lienSuivant())
          }}
          className="tactile w-full rounded-pilule border-2 border-trait-discret px-8 text-lg font-semibold hover:border-prune disabled:opacity-60"
        >
          {C.$aEcrire.photosPasser}
        </button>
      </div>
    </>
  )
}

const annonce = (f: File, genre: string): FichierAnnonce => ({
  nom: f.name,
  type: f.type,
  taille: f.size,
  genre,
})

function ChampFichiers({
  id,
  label,
  fichiers,
  onChange,
}: {
  id: string
  label: string
  fichiers: File[]
  onChange: (f: File[]) => void
}) {
  return (
    <div className="mt-6">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(',')}
        onChange={(e) => {
          onChange([...(e.target.files ?? [])])
        }}
        className="mt-2 w-full rounded-champ border-2 border-trait-discret px-5 py-4"
      />
      {fichiers.length > 0 ? (
        <p className="mt-2 text-sm text-texte-secondaire">
          {remplir(C.$aEcrire.photosChoisies, { n: String(fichiers.length) })}
        </p>
      ) : null}
    </div>
  )
}
