'use client'

import { useState } from 'react'
import type { SuggestionSaisie } from '@/lib/adresse'
import { SaisieAssistee } from '@/components/trousse'
import { chercherAdressesAssistee } from '@/app/[slug]/reserver/adresse-actions'

/**
 * B12 — la saisie d'une adresse, au fil de la frappe.
 *
 * **Un seul composant pour les trois écrans** : la zone d'intervention passe
 * déjà par `SaisieAssistee` avec le référentiel des communes, et les deux
 * saisies d'adresse (le tunnel cliente, le rendez-vous manuel) passent par
 * celui-ci. Deux sources, une seule expérience, et surtout une seule
 * implémentation des trois précautions réseau.
 *
 * Il alimente trois champs cachés d'un coup : la ligne, le code postal et la
 * ville. C'est ce qui fait la différence entre « la saisie est assistée » et
 * « la saisie est plus rapide » : la cliente ne retape pas ce que la BAN vient
 * de lui donner.
 *
 * Chemin gracieux, non négociable : quand la source ne répond pas, la saisie
 * reste possible à la main. Une adresse rurale que le référentiel ignore ne
 * doit jamais empêcher une réservation.
 */
export function ChampAdresse({
  id,
  label,
  aide,
  placeholder,
  defaut,
  nomLigne = 'a',
  nomCodePostal = 'cp',
  nomVille = 'v',
}: {
  id: string
  label: string
  aide?: string
  placeholder?: string
  defaut?: { ligne?: string; codePostal?: string; ville?: string }
  nomLigne?: string
  nomCodePostal?: string
  nomVille?: string
}) {
  const [choisie, setChoisie] = useState<SuggestionSaisie | null>(
    defaut?.ligne
      ? {
          libelle: defaut.ligne,
          codePostal: defaut.codePostal ?? null,
          ville: defaut.ville ?? null,
          lat: null,
          lng: null,
        }
      : null,
  )
  const [libre, setLibre] = useState('')

  return (
    <>
      <SaisieAssistee<SuggestionSaisie>
        id={id}
        label={label}
        aide={aide}
        placeholder={placeholder}
        chercher={(terme) => {
          setLibre(terme)
          return chercherAdressesAssistee(terme)
        }}
        cle={(s) => `${s.libelle}-${s.codePostal ?? ''}`}
        rendu={(s) => <span className="font-semibold">{s.libelle}</span>}
        choisi={choisie?.libelle}
        onEffacer={() => {
          setChoisie(null)
        }}
        onChoix={setChoisie}
        messageAucun="Aucune adresse trouvée. Vous pouvez la saisir telle quelle."
        messageIndisponible="La recherche d’adresses ne répond pas. Saisissez-la à la main."
      />
      {/*
        La saisie libre reste la valeur de repli : en rural, un hameau ou une
        construction récente peuvent n'être reconnus par aucun référentiel, et
        rien ne doit bloquer (règle du moteur géo, R2-7 bis).
      */}
      <input type="hidden" name={nomLigne} value={choisie?.libelle ?? libre} />
      <input type="hidden" name={nomCodePostal} value={choisie?.codePostal ?? ''} />
      <input type="hidden" name={nomVille} value={choisie?.ville ?? ''} />
    </>
  )
}
