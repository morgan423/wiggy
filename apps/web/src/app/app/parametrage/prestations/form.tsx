'use client'

import { useActionState, useState } from 'react'
import { creerPrestation } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher } from '@/components/trousse'
import { ActionPrincipale, BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'

/**
 * Planche 14d : l'ajout est une feuille qui S'OUVRE SUR ACTION.
 *
 * Le formulaire était déployé en permanence sous la liste, à côté d'un bouton
 * « + Ajouter une prestation » : deux affordances d'ajout concurrentes sur le
 * même écran, dont l'une n'attendait aucun geste. Défaut relevé à la recette 6.
 *
 * Une seule affordance désormais, et elle commande l'ouverture.
 */
export function FormPrestation({ premiere = false }: { premiere?: boolean }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(creerPrestation, VIDE)
  const [ouvert, setOuvert] = useState(false)

  // Une erreur ne doit pas effacer la saisie : React 19 réinitialise le
  // formulaire après chaque action, on le repeuple avec ce qui a été soumis.
  const repris = (champ: string) => (etat.statut === 'erreur' ? (etat.saisie?.[champ] ?? '') : '')

  if (!ouvert) {
    return premiere ? (
      <ActionPrincipale
        onClick={() => {
          setOuvert(true)
        }}
      >
        Ajouter une prestation
      </ActionPrincipale>
    ) : (
      <BoutonPointille
        onClick={() => {
          setOuvert(true)
        }}
      >
        + Ajouter une prestation
      </BoutonPointille>
    )
  }

  return (
    // `key` remet le formulaire à blanc après un ajout réussi : on enchaîne
    // les prestations sans avoir à tout effacer à la main.
    // La feuille de la planche 14d : poignée centrée, titre en Fraunces, champs
    // sur la surface. Elle s'ouvre en place plutôt qu'en surimpression, faute
    // d'une feuille montante spécifiée ailleurs qu'en 14d.
    <form action={action} key={etat.n} className="rounded-carte bg-fond">
      <span aria-hidden className="mx-auto block h-1 w-10 rounded-pilule bg-trait-discret" />
      <h2 className="titre mt-2.5 font-bold tracking-tight">Nouvelle prestation</h2>
      <Champ
        id="name"
        label="Nom de la prestation"
        defaultValue={repris('name')}
        aide="Par exemple : Coupe + brushing"
      />
      <div className="grid grid-cols-2 gap-3">
        <Champ
          id="price_cents"
          label="Prix"
          defaultValue={repris('price_cents')}
          aide="En euros, par exemple 42,50"
        />
        <Champ
          id="duration_min"
          label="Durée"
          type="number"
          defaultValue={repris('duration_min')}
          aide="En minutes"
        />
      </div>
      <Champ
        id="deposit_percent"
        label="Acompte pour cette prestation (facultatif)"
        type="number"
        required={false}
        defaultValue={repris('deposit_percent')}
        aide="En %. Laisse vide pour suivre ton réglage général."
      />
      <CaseACocher
        id="active"
        label="Visible sur ta page de réservation"
        defaultChecked
        aide="Décoche pour la préparer sans la proposer encore."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Ajouter la prestation</BoutonPrincipal>
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
