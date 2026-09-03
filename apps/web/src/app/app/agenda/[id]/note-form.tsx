'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerNoteRdv } from '@/app/app/clientes/actions'

/**
 * B3 — la note d'un rendez-vous, distincte de la fiche cliente.
 *
 * La distinction n'est pas cosmétique. « Elle avait les cheveux mouillés en
 * arrivant » ne doit pas se réafficher aux dix visites suivantes ; « formule
 * 6.35 + 20 vol » doit se réafficher à toutes. Deux durées de vie, deux
 * champs, et le texte d'aide dit laquelle est laquelle.
 */
export function FormNoteRdv({ id, note }: { id: string; note: string | null }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerNoteRdv, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const F = copy.ficheCliente

  const valeur = etat.statut === 'ok' ? (etat.saisie?.note ?? '') : (note ?? '')

  if (!ouvert) {
    if (!valeur) {
      return (
        <BoutonPointille
          onClick={() => {
            setOuvert(true)
          }}
        >
          + {F.$aEcrire.noteDuRdv}
        </BoutonPointille>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true)
        }}
        className="block w-full rounded-[14px] bg-surface px-3 py-2.5 text-left text-[12.5px] leading-[1.5] hover:bg-fond"
      >
        <span className="font-extrabold">{F.$aEcrire.noteDuRdv}</span> · {valeur}
      </button>
    )
  }

  return (
    <form action={action} key={etat.n}>
      <input type="hidden" name="id" value={id} />
      <Zone
        id="note"
        label={F.$aEcrire.noteDuRdv}
        defaultValue={valeur}
        rows={3}
        aide={F.$aEcrire.noteDuRdvAide}
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
      <button
        type="button"
        onClick={() => {
          setOuvert(false)
        }}
        className="tactile mt-1 w-full text-[12.5px] font-bold text-texte-attenue hover:text-prune"
      >
        Annuler
      </button>
    </form>
  )
}
