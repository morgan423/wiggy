'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { groupesDeLaPro } from '@wiggy/core'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { RANGEE } from '@/components/composition'
import { renommerGroupe } from './actions'
import { VIDE, type EtatForm } from '@/lib/forms'

/**
 * Le renommage d'un groupe, depuis l'écran des prestations.
 *
 * ⚠️ **C'EST LUI QUI RÈGLE LE VRAI PROBLÈME**, pas la liste déroulante du
 * formulaire. Le nom du groupe est **recopié dans chaque prestation** : sans
 * cet écran, passer de « Coupe » à « Coupes femme » demande de rouvrir ses
 * quatre prestations et de retaper exactement la même chaîne dans chacune. Une
 * seule oubliée, et la page publique montre **deux groupes** sans que personne
 * comprenne pourquoi. La liste déroulante empêche d'en créer de nouveaux par
 * erreur ; elle ne répare pas ceux qui existent déjà.
 *
 * ⚠️ **LA SECTION DISPARAÎT QUAND IL N'Y A AUCUN GROUPE**, et ce n'est pas une
 * économie de pixels : B13 pose que ranger est un confort. Une section « Tes
 * groupes » vide sur l'écran de quelqu'un qui n'a rien rangé donnerait
 * exactement l'impression qu'il manque une étape.
 *
 * Il n'y a **aucune table de groupes** : la liste se déduit des prestations.
 */
export function Groupes({ prestations }: { prestations: readonly { category: string | null }[] }) {
  const groupes = groupesDeLaPro(prestations)
  if (groupes.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-[11.5px] font-bold tracking-widest text-texte-attenue uppercase">
        {copy.agendaTournee.$aEcrire.groupesTitre}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {groupes.map((nom) => (
          <RangeeGroupe key={nom} nom={nom} />
        ))}
      </ul>
    </section>
  )
}

function RangeeGroupe({ nom }: { nom: string }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(renommerGroupe, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const T = copy.agendaTournee

  if (!ouvert) {
    return (
      <li className={RANGEE}>
        <span className="text-[13.5px] font-bold">{nom}</span>
        <button
          type="button"
          onClick={() => {
            setOuvert(true)
          }}
          className="tactile ml-auto text-[11.5px] font-bold text-texte-attenue hover:text-prune"
        >
          {T.$aEcrire.groupeRenommer}
        </button>
      </li>
    )
  }

  return (
    <li>
      <form action={action} key={etat.n} className="rounded-carte bg-fond">
        <input type="hidden" name="ancien" value={nom} />
        <Champ
          id="nouveau"
          label={T.$aEcrire.groupeNouveauLabel}
          defaultValue={etat.statut === 'erreur' ? (etat.saisie?.nouveau ?? nom) : nom}
        />
        <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
        <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
        <BoutonPrincipal enCours={enCours}>{T.$aEcrire.prestationEnregistrer}</BoutonPrincipal>
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
    </li>
  )
}
