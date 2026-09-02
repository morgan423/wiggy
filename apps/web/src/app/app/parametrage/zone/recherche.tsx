'use client'

import { useActionState, useEffect, useState } from 'react'
import type { Commune } from '@wiggy/core'
import { SaisieAssistee } from '@/components/trousse'
import { Succes } from '@/components/champs'
import { BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { chercherCommunesAssistee, ajouterCommune } from './actions'

/**
 * B12 sur l'écran de zone : la commune se cherche au fil de la frappe.
 *
 * C'est la décision D6 qui rend ce composant possible ici. Tant que le
 * référentiel vivait derrière un appel réseau, chercher à chaque frappe aurait
 * multiplié les occasions de tomber ; en base, la recherche est locale et
 * instantanée.
 *
 * Le délai, l'annulation des requêtes dépassées et le chemin gracieux vivent
 * dans le composant, pas ici : ils serviront tels quels à la source distante
 * des adresses, aux lots suivants.
 */
export function RechercheCommune({
  dejaChoisies,
  replie = false,
}: {
  dejaChoisies: string[]
  /**
   * Planche 14e : une fois la zone posée, l'ajout redevient une puce en
   * pointillés « + Commune », et le champ ne s'ouvre qu'au clic. Un champ
   * ouvert en permanence à côté d'une puce d'ajout ferait deux affordances
   * concurrentes, défaut déjà relevé à la recette 6.
   */
  replie?: boolean
}) {
  const [commune, setCommune] = useState<Commune | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [etat, action] = useActionState<EtatForm, FormData>(ajouterCommune, VIDE)

  // Une commune ajoutée quitte le champ : elle est désormais dans la liste
  // au-dessus, la garder ici laisserait croire qu'il reste quelque chose à faire.
  useEffect(() => {
    if (etat.statut === 'ok') setCommune(null)
  }, [etat.statut, etat.n])

  if (replie && !ouvert) {
    return (
      <BoutonPointille
        compact
        onClick={() => {
          setOuvert(true)
        }}
      >
        + Commune
      </BoutonPointille>
    )
  }

  return (
    <form action={action} className="w-full">
      <SaisieAssistee<Commune>
        key={etat.n}
        id="commune"
        label="Nom de la commune"
        placeholder="Pau, Lescar, st paul…"
        aide="Les résultats s’affichent dès deux lettres. Les abréviations sont comprises : « st paul » trouve Saint-Paul."
        chercher={(terme) => chercherCommunesAssistee(terme)}
        cle={(c) => c.insee_code}
        rendu={(c) => (
          <span className="flex w-full items-baseline gap-3">
            <span className="font-semibold">{c.name}</span>
            {c.postal_code ? <span className="text-texte-secondaire">{c.postal_code}</span> : null}
            {dejaChoisies.includes(c.insee_code) ? (
              <span className="ml-auto text-[11.5px] font-bold text-texte-attenue">
                Déjà dans ta zone
              </span>
            ) : null}
          </span>
        )}
        choisi={
          commune
            ? `${commune.name}${commune.postal_code ? ` · ${commune.postal_code}` : ''}`
            : undefined
        }
        onEffacer={() => {
          setCommune(null)
        }}
        onChoix={setCommune}
        messageAucun="Aucune commune de ce nom."
        messageIndisponible="La recherche ne répond pas. Réessaie dans un instant."
      />

      {commune ? (
        <>
          <input type="hidden" name="insee_code" value={commune.insee_code} />
          <input type="hidden" name="name" value={commune.name} />
          <input type="hidden" name="postal_code" value={commune.postal_code ?? ''} />
          <input type="hidden" name="lat" value={commune.lat ?? ''} />
          <input type="hidden" name="lng" value={commune.lng ?? ''} />
          <button
            type="submit"
            disabled={dejaChoisies.includes(commune.insee_code)}
            className="tactile mt-3 w-full rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee disabled:bg-action/35"
          >
            {dejaChoisies.includes(commune.insee_code)
              ? 'Déjà dans ta zone'
              : `Ajouter ${commune.name} à ta zone`}
          </button>
        </>
      ) : null}
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
    </form>
  )
}
