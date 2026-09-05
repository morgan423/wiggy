'use client'

import { useActionState, useState } from 'react'
import { creerPrestation, modifierPrestation } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher, ListeDeroulante } from '@/components/trousse'
import { ActionPrincipale, BoutonPointille } from '@/components/composition'
import { copy } from '@wiggy/copy'
import { optionsDeGroupe, CREER_UN_GROUPE, VALEUR_NEUTRE } from '@wiggy/core'
import { VIDE, type EtatForm } from '@/lib/forms'

/** Ce que la feuille a besoin de savoir d'une prestation pour la rouvrir. */
export type PrestationEditable = {
  id: string
  name: string
  price_cents: number
  duration_min: number
  deposit_percent: number | null
  category: string | null
  photos_required: boolean
  active: boolean
}

/**
 * Planche 14d : l'ajout ET L'ÉDITION passent par une feuille qui s'ouvre sur
 * action.
 *
 * ⚠️ **L'ÉDITION MANQUAIT DEPUIS LA LIVRAISON.** L'écran le déclarait en
 * commentaire — « la planche 14d fait passer l'édition par une feuille montante,
 * qui n'est pas construite » — et l'écart n'a jamais été refermé. Une prestation
 * ne pouvait être que masquée ou supprimée.
 *
 * ⚠️ **ET LA CONSÉQUENCE DÉPASSAIT LE CONFORT** : le champ « Groupe » n'était
 * atteignable qu'à la création. Une pro ayant déjà posé ses six prestations ne
 * pouvait plus les ranger, sauf à les supprimer et les recréer. C'est ce trou
 * qui a rendu le défaut du groupe invisible jusqu'à ce que Morgan veuille
 * simplement ranger sa liste.
 */
export function FormPrestation({
  premiere = false,
  prestations,
  edite,
  onFerme,
}: {
  premiere?: boolean
  /** Ses prestations, d'où se déduisent SES groupes. Aucune table de groupes. */
  prestations: readonly { category: string | null }[]
  /** Renseigné : la feuille s'ouvre en édition, pré-remplie. */
  edite?: PrestationEditable
  onFerme?: () => void
}) {
  const enEdition = edite !== undefined
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(
    enEdition ? modifierPrestation : creerPrestation,
    VIDE,
  )
  const [ouvert, setOuvert] = useState(enEdition)
  const T = copy.agendaTournee

  // Une erreur ne doit pas effacer la saisie : React 19 réinitialise le
  // formulaire après chaque action, on le repeuple avec ce qui a été soumis.
  const repris = (champ: string, defaut = '') =>
    etat.statut === 'erreur' ? (etat.saisie?.[champ] ?? '') : defaut

  /*
    ⚠️ LE GROUPE EST UN CHOIX, ET « AUCUN GROUPE » EN EST UN.

    C'est le piège de cette reprise, et il pèse plus que la mécanique : une
    liste déroulante RESSEMBLE À UN CHOIX OBLIGATOIRE, là où un champ vide
    ressemblait à une option. B13 pose que le groupe est un confort, jamais une
    étape. « Aucun groupe » est donc l'option NEUTRE de la trousse — première,
    par défaut, et portant la valeur vide. Si l'écran donnait à une pro
    l'impression qu'il lui manque quelque chose, il serait faux même en
    fonctionnant.
  */
  const [groupe, setGroupe] = useState(edite?.category ?? VALEUR_NEUTRE)
  const options = optionsDeGroupe(prestations, T.$aEcrire.groupeCreer)

  const fermer = () => {
    setOuvert(false)
    onFerme?.()
  }

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
    <form action={action} key={etat.n} className="rounded-carte bg-fond">
      <span aria-hidden className="mx-auto block h-1 w-10 rounded-pilule bg-trait-discret" />
      {enEdition ? <input type="hidden" name="id" value={edite.id} /> : null}
      <h2 className="titre mt-2.5 font-bold tracking-tight">
        {enEdition ? T.$aEcrire.prestationTitreEdition : 'Nouvelle prestation'}
      </h2>
      <Champ
        id="name"
        label="Nom de la prestation"
        defaultValue={repris('name', edite?.name ?? '')}
        aide="Par exemple : Coupe + brushing"
      />
      <div className="grid grid-cols-2 gap-3">
        <Champ
          id="price_cents"
          label="Prix"
          defaultValue={repris('price_cents', edite ? euros(edite.price_cents) : '')}
          aide="En euros, par exemple 42,50"
        />
        <Champ
          id="duration_min"
          label="Durée"
          type="number"
          defaultValue={repris('duration_min', edite ? String(edite.duration_min) : '')}
          aide="En minutes"
        />
      </div>
      <Champ
        id="deposit_percent"
        label="Acompte pour cette prestation (facultatif)"
        type="number"
        required={false}
        defaultValue={repris('deposit_percent', String(edite?.deposit_percent ?? ''))}
        aide="En %. Laisse vide pour suivre ton réglage général."
      />

      <ListeDeroulante
        id="category-choix"
        label={T.$aEcrire.groupeLabel}
        valeur={groupe}
        onValeur={setGroupe}
        options={options}
        optionNeutre={T.$aEcrire.groupeAucun}
        aide={T.$aEcrire.groupeAide}
        name={groupe === CREER_UN_GROUPE ? undefined : 'category'}
      />
      {/* La saisie libre n'apparaît QUE si elle a été demandée : la proposer en
          permanence remettrait un champ de texte à remplir, donc l'impression
          d'une étape. */}
      {groupe === CREER_UN_GROUPE ? (
        <Champ id="category" label={T.$aEcrire.groupeNouveauLabel} required={false} />
      ) : null}

      {/*
        A4 — imposer les photos partout fait abandonner des réservations
        simples ; ne les imposer nulle part laisse arriver des prestations mal
        qualifiées. La pro coche là où ça compte.

        ⚠️ ALIGNÉES À GAUCHE, comme tout le reste du formulaire. Les deux cases
        et leurs mentions étaient centrées : elles cassaient l'axe de lecture
        des champs juste au-dessus, et « tout-centré banni » vaut ici comme
        ailleurs.
      */}
      <div className="flex flex-col items-start gap-3 text-left">
        <CaseACocher
          id="photos_required"
          name="photos_required"
          label={T.prestation.photosRequises}
          aide={T.prestation.photosRequisesAide}
          defaultChecked={edite?.photos_required ?? false}
        />
        <CaseACocher
          id="active"
          label="Visible sur ta page de réservation"
          defaultChecked={edite?.active ?? true}
          aide="Décoche pour la préparer sans la proposer encore."
        />
      </div>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>
        {enEdition ? T.$aEcrire.prestationEnregistrer : 'Ajouter la prestation'}
      </BoutonPrincipal>
      <button
        type="button"
        onClick={fermer}
        className="tactile mt-1 w-full text-[12.5px] font-bold text-texte-attenue hover:text-prune"
      >
        Annuler
      </button>
    </form>
  )
}

/** Les centimes en euros saisissables : « 4250 » devient « 42,50 ». */
function euros(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',')
}
