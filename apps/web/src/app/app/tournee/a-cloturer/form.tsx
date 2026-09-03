'use client'

import { useState } from 'react'
import { copy } from '@wiggy/copy'
import { Champ, Zone } from '@/components/champs'
import { RANGEE } from '@/components/composition'
import { terminerRdv } from '@/app/app/agenda/actions'

/**
 * D15 — clôturer plus tard, en complétant la fiche dans le même geste.
 *
 * Le soir, c'est le seul moment où la durée réelle et la note seront écrites.
 * Les demander ici n'est pas de la saisie en plus : c'est la seule saisie qui
 * aura lieu.
 *
 * La durée déclarée fait foi, et pas la mesure : quand la pro clôture à 22 h un
 * rendez-vous de 14 h, « maintenant moins le début » ne veut rien dire. Sa
 * réponse est une correction manuelle au sens de B5, donc une instruction.
 */
export function FormCloture({
  id,
  cliente,
  prestation,
  quand,
  dureePrevueMin,
}: {
  id: string
  cliente: string
  prestation: string
  quand: string
  dureePrevueMin: number
}) {
  const [ouvert, setOuvert] = useState(false)
  const T = copy.agendaTournee

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true)
        }}
        className={`${RANGEE} items-start text-left hover:bg-fond`}
      >
        <span className="flex min-w-0 flex-col gap-px">
          <span className="text-[13.5px] font-bold">
            {cliente} · {prestation}
          </span>
          <span className="text-[11.5px] text-texte-attenue">{quand}</span>
        </span>
        <span className="shrink-0 rounded-pilule bg-attente px-2 py-1 text-[10px] font-extrabold whitespace-nowrap text-texte-sur-miel">
          {T.$aEcrire.aCloturer}
        </span>
      </button>
    )
  }

  return (
    <form action={terminerRdv} className="rounded-carte bg-surface px-3.5 py-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-[13.5px] font-bold">
        {cliente} · {prestation}
      </p>
      <p className="text-[11.5px] text-texte-attenue">{quand}</p>
      <Champ
        id={`duree-${id}`}
        name="duree_min"
        label={T.$aEcrire.dureeReelle}
        type="number"
        required={false}
        defaultValue={String(dureePrevueMin)}
        aide={T.$aEcrire.dureeReelleAide}
      />
      <Zone id={`note-${id}`} name="note" label={copy.ficheCliente.$aEcrire.noteDuRdv} rows={2} />
      <button
        type="submit"
        className="tactile mt-3 w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
      >
        {T.$aEcrire.cloturerEtNoter}
      </button>
    </form>
  )
}
