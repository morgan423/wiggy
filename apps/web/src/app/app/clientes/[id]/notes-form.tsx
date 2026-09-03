'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerNotes } from '../actions'

/**
 * B2 — les annotations techniques, la mémoire de la pro.
 *
 * ⚠️ **Pas de données de santé, jamais** (`CLAUDE.md`). Le texte d'aide et
 * l'exemple orientent vers **le produit, la formule et le geste**, jamais vers
 * la personne. C'est l'interface qui tient cette frontière : elle n'invite
 * jamais à saisir une allergie médicale, et on ne filtre pas la saisie, ce qui
 * reviendrait à lire les notes de la pro.
 *
 * Repliées, les notes s'affichent sur quatre lignes au plus, avec « Tout lire »
 * (planche 16c). Jamais de fondu : c'est son outil, pas une vitrine.
 */
export function FormNotes({ id, notes }: { id: string; notes: string | null }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerNotes, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const [tout, setTout] = useState(false)
  const F = copy.ficheCliente

  const valeur = etat.statut === 'ok' ? (etat.saisie?.technical_notes ?? '') : (notes ?? '')

  if (!ouvert) {
    if (!valeur) {
      return (
        <BoutonPointille
          onClick={() => {
            setOuvert(true)
          }}
        >
          {F.notes.invite}
        </BoutonPointille>
      )
    }
    return (
      <div className="rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5]">
        <span className="font-extrabold">{F.notes.titre}</span> ·{' '}
        <span className={tout ? '' : 'line-clamp-4'}>{valeur}</span>
        <span className="mt-1 flex gap-3">
          {!tout && valeur.length > 160 ? (
            <button
              type="button"
              onClick={() => {
                setTout(true)
              }}
              className="text-[12px] font-extrabold text-texte-secondaire hover:text-prune"
            >
              {F.notes.toutLire}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setOuvert(true)
            }}
            className="text-[12px] font-extrabold text-action hover:text-action-survol"
          >
            {F.notes.modifier}
          </button>
        </span>
      </div>
    )
  }

  return (
    <form action={action} key={etat.n}>
      <input type="hidden" name="id" value={id} />
      <Zone
        id="technical_notes"
        label={F.notes.titre}
        defaultValue={valeur}
        rows={5}
        aide={F.$aEcrire.notesAide}
      />
      <p className="mt-1 text-[11px] text-texte-attenue">{F.notes.exemple}</p>
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
