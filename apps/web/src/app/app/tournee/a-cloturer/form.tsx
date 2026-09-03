'use client'

import { useState } from 'react'
import { copy } from '@wiggy/copy'
import { Champ, Zone } from '@/components/champs'
import { RANGEE, RANGEE_ACTIVABLE } from '@/components/composition'
import { terminerRdv } from '@/app/app/agenda/actions'

/**
 * D15 — clôturer plus tard, en complétant la fiche dans le même geste.
 *
 * ⚠️ **Rien n'est obligatoire ici, et surtout pas la durée.** Une pro qui ferme
 * sa journée à 22 h doit pouvoir le faire d'un tap. Un geste de clôture ne se
 * refuse pas pour une donnée d'optimisation : le champ est proposé, jamais
 * imposé, et il part VIDE.
 *
 * Vide, il ne se remplit pas tout seul de la durée prévue : sans saisie, aucune
 * mesure n'est enregistrée et l'apprentissage ignore ce rendez-vous. Le
 * pré-remplir avec la prévision ferait converger l'apprentissage vers sa propre
 * sortie, et il afficherait de la confiance sans avoir rien appris.
 *
 * Quand la pro SAISIT une durée, en revanche, sa réponse fait foi : c'est une
 * instruction au sens de B5, pas une mesure parmi d'autres.
 */
export function FormCloture({
  id,
  cliente,
  prestation,
  quand,
  dureePrevueMin,
  note,
  derniereEntree,
}: {
  id: string
  cliente: string
  prestation: string
  quand: string
  dureePrevueMin: number
  /** B3 : ce qui reste attaché à CE rendez-vous. */
  note: string | null
  /**
   * B2 : ce qui a été fait la DERNIÈRE fois. Proposé pour repartir de là, et
   * enregistrer crée une NOUVELLE entrée datée : rien n'est jamais écrasé.
   */
  derniereEntree: string | null
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
        className={`${RANGEE} items-start text-left ${RANGEE_ACTIVABLE}`}
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
        placeholder={String(dureePrevueMin)}
        aide={T.$aEcrire.dureeReelleAide}
      />
      {/*
        DEUX champs, et pas un. Le soir, la pro a deux informations différentes
        en tête, et les mélanger les perdrait toutes les deux : « elle avait les
        cheveux mouillés en arrivant » ne doit pas revenir aux dix visites
        suivantes, « formule 6.35 » doit revenir à toutes.

        Le texte fait la différence sans l'expliquer : l'un dit « ce
        rendez-vous », l'autre dit « la prochaine fois ».
      */}
      <Zone
        id={`note-${id}`}
        name="note"
        label={T.$aEcrire.noteDuJour}
        defaultValue={note ?? ''}
        rows={2}
        aide={T.$aEcrire.noteDuJourAide}
      />
      <Zone
        id={`fait-${id}`}
        name="fait_aujourdhui"
        label={copy.ficheCliente.$aEcrire.faitAujourdhui}
        defaultValue={derniereEntree ?? ''}
        rows={2}
        aide={copy.ficheCliente.$aEcrire.faitAujourdhuiAide}
      />
      <button
        type="submit"
        className="tactile mt-3 w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
      >
        {T.$aEcrire.cloturerEtNoter}
      </button>
    </form>
  )
}
