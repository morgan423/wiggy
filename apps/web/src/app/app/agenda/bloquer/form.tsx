'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { SelecteurDate, SelecteurHeure } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { bloquerPlage } from '../actions'

/**
 * B4 — la saisie d'une plage bloquée.
 *
 * Un jour, deux heures, et un motif facultatif qui ne sort jamais de l'app :
 * une cliente n'a pas à savoir que sa coiffeuse a rendez-vous chez le médecin.
 *
 * Aucune heure n'est pré-sélectionnée (R3-1) : « Choisis un jour » vaut ici
 * comme ailleurs, et une plage qu'on n'a pas choisie ne se bloque pas.
 */
export function FormBlocage() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(bloquerPlage, VIDE)
  const [jour, setJour] = useState('')
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const T = copy.agendaTournee

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <SelecteurDate id="jour" label="Le jour" valeur={jour} onValeur={setJour} />
      <div className="grid grid-cols-2 gap-3">
        <SelecteurHeure id="de" label="De" valeur={debut} onValeur={setDebut} />
        <SelecteurHeure id="a" label="À" valeur={fin} onValeur={setFin} />
      </div>
      {/* Les bornes partent en heures murales françaises : la conversion en
          instant appartient au domaine, jamais à l'écran. */}
      <input type="hidden" name="debut" value={jour && debut ? `${jour}T${debut}` : ''} />
      <input type="hidden" name="fin" value={jour && fin ? `${jour}T${fin}` : ''} />
      <Champ
        id="label"
        label={T.$aEcrire.blocageMotif}
        required={false}
        aide={T.$aEcrire.blocageMotifAide}
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>{T.$aEcrire.bloquer}</BoutonPrincipal>
    </form>
  )
}
