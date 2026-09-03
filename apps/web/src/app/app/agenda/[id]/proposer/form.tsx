'use client'

import { useActionState, useState } from 'react'
import { copy, remplir } from '@wiggy/copy'
import { Champ, Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { contreProposer } from './actions'

/**
 * A11 ② — la contre-proposition, côté pro.
 *
 * Cas type, et il vient du terrain : les photos révèlent une coupe longue
 * réservée en coupe moyenne. La pro ajuste la prestation, la durée et le prix,
 * explique pourquoi, et **attend l'accord de sa cliente**.
 *
 * ⚠️ Textes PROVISOIRES : Design travaille sur le copy de la contre-proposition.
 * La mécanique est là, les mots changeront.
 */
export function FormProposition({
  id,
  prenom,
  serviceNom,
  prix,
  dureeMin,
}: {
  id: string
  prenom: string
  serviceNom: string
  prix: string
  dureeMin: number
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(contreProposer, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const D = copy.demandesPro

  if (!ouvert) {
    return (
      <BoutonPointille
        onClick={() => {
          setOuvert(true)
        }}
      >
        {D.proposition.ajuster}
      </BoutonPointille>
    )
  }

  return (
    <form action={action} key={etat.n}>
      <input type="hidden" name="id" value={id} />
      <p className="text-[12px] leading-[1.5] text-texte-attenue">
        {remplir(D.gabarits.ajusterAide, { prenom })}
      </p>
      <Champ id="service_name" label="Prestation" defaultValue={serviceNom} required={false} />
      <div className="grid grid-cols-2 gap-3">
        <Champ id="prix" label="Prix" defaultValue={prix} required={false} />
        <Champ
          id="duree"
          label="Durée"
          type="number"
          defaultValue={String(dureeMin)}
          required={false}
        />
      </div>
      <Zone
        id="message"
        label={D.$aEcrire.propositionMot}
        rows={3}
        aide={D.$aEcrire.propositionMotAide}
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>{D.proposition.envoyer}</BoutonPrincipal>
    </form>
  )
}
