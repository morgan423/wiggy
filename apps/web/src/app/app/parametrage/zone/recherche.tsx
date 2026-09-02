'use client'

import { useState } from 'react'
import type { Commune } from '@wiggy/core'
import { SaisieAssistee } from '@/components/trousse'
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
export function RechercheCommune({ dejaChoisies }: { dejaChoisies: string[] }) {
  const [commune, setCommune] = useState<Commune | null>(null)

  return (
    <form action={ajouterCommune}>
      <SaisieAssistee<Commune>
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
              <span className="ml-auto text-sm font-semibold text-texte-secondaire">
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
            className="tactile mt-6 w-full rounded-pilule bg-action px-8 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee disabled:opacity-60"
          >
            {dejaChoisies.includes(commune.insee_code)
              ? 'Déjà dans ta zone'
              : `Ajouter ${commune.name} à ta zone`}
          </button>
        </>
      ) : null}
    </form>
  )
}
