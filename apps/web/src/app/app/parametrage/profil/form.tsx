'use client'

import { useActionState, useState } from 'react'
import { enregistrerProfil, basculerPublication } from './actions'
import { Champ, Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { ListeDeroulante } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'

type Profil = {
  display_name: string
  headline: string | null
  bio: string | null
  city: string | null
  instagram_url: string | null
  phone: string | null
  years_experience: number | null
  pronoun: string | null
}

export function FormProfil({ profil }: { profil: Profil }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerProfil, VIDE)

  // Ce qui s'affiche après un aller-retour vient de la réponse du serveur, pas
  // du rendu précédent : en erreur c'est la saisie, en succès c'est la ligne
  // relue en base. `key` force le remontage, sans quoi un champ non contrôlé
  // ignore un changement de `defaultValue`.
  const valeur = (champ: keyof Profil) => etat.saisie?.[champ] ?? profil[champ]?.toString() ?? ''

  // R3-1 ② : la valeur affichée par la liste EST la valeur soumise. Un seul
  // état, tenu ici : il n'existe pas de second chemin qui pourrait diverger.
  const [pronom, setPronom] = useState(valeur('pronoun'))

  return (
    <form action={action} key={etat.n}>
      <Champ
        id="display_name"
        label="Ton nom professionnel"
        defaultValue={valeur('display_name')}
      />
      <Champ
        id="headline"
        label="Ta phrase d’accroche"
        required={false}
        defaultValue={valeur('headline')}
        aide="Par exemple : Coiffure à domicile à Pau"
      />
      <Zone
        id="bio"
        label="Ta présentation"
        defaultValue={valeur('bio')}
        aide="Quelques lignes, à la première personne. C’est ce que lira ta clientèle."
      />
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <Champ id="city" label="Ta ville" required={false} defaultValue={valeur('city')} />
        <Champ
          id="years_experience"
          label="Années d’expérience"
          type="number"
          required={false}
          defaultValue={valeur('years_experience')}
        />
      </div>
      <ListeDeroulante
        id="pronoun"
        label="Comment ta clientèle parle de toi"
        valeur={pronom}
        onValeur={setPronom}
        optionNeutre="Je préfère ne pas préciser"
        options={[
          { valeur: 'elle', texte: 'Elle' },
          { valeur: 'il', texte: 'Il' },
        ]}
        aide="Sert à accorder les phrases de ta page de réservation. Sans réponse, elles restent neutres."
      />
      <Champ
        id="instagram_url"
        label="Ton Instagram"
        type="url"
        required={false}
        defaultValue={valeur('instagram_url')}
        aide="Facultatif. Adresse complète du profil."
      />
      <Champ
        id="phone"
        label="Ton téléphone"
        type="tel"
        required={false}
        defaultValue={valeur('phone')}
        aide="Pour te joindre. Il n’est jamais affiché sur ta page publique."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}

export function BoutonPublication({ publiee }: { publiee: boolean }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(basculerPublication, VIDE)

  return (
    <form action={action}>
      <input type="hidden" name="publier" value={String(!publiee)} />
      <button
        type="submit"
        disabled={enCours}
        className={`rounded-pilule px-8 py-4 text-lg font-bold disabled:opacity-60 ${
          publiee
            ? 'border-2 border-trait-discret hover:border-prune'
            : 'bg-action text-texte-sur-plein hover:bg-action-survol'
        }`}
      >
        {enCours ? 'Un instant…' : publiee ? 'Retirer ma page' : 'Publier ma page'}
      </button>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
    </form>
  )
}
