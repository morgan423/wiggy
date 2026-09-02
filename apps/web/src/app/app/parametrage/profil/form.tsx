'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
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
      <div className="grid grid-cols-2 gap-3">
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

/**
 * L'adresse publique, et de quoi la copier. Planche 14g : « wiggy.fr/sophie ·
 * Copier le lien », sur une seule ligne, sous le nom.
 */
export function LienPage({ adresse }: { adresse: string }) {
  const [copie, setCopie] = useState(false)

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 text-[12px] text-texte-attenue">
      <span className="break-all">{adresse}</span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(`https://${adresse}`).then(() => {
            setCopie(true)
          })
        }}
        className="font-extrabold text-action hover:text-action-survol"
      >
        {copie ? 'Lien copié' : 'Copier le lien'}
      </button>
    </span>
  )
}

/**
 * La mise en ligne, planche 14g.
 *
 * Désactivée, elle reste framboise à 35 % : elle ne devient pas grise, elle dit
 * seulement qu'il manque quelque chose, et la phrase sous elle nomme quoi.
 * Une fois la page en ligne, l'action principale devient « Voir ma page » et le
 * retrait passe en second plan : retirer sa page n'est pas ce qu'on vient faire
 * ici tous les jours.
 */
export function BoutonPublication({
  publiee,
  pret,
  slug,
}: {
  publiee: boolean
  pret: boolean
  slug: string
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(basculerPublication, VIDE)

  if (publiee) {
    return (
      <form action={action} className="mt-auto flex flex-col gap-2 pt-4 pb-3.5">
        <input type="hidden" name="publier" value="false" />
        {/*
          Planche 14a : une seule action principale par écran. Ici, c'est
          « Enregistrer » du formulaire au-dessus. Voir et retirer sa page sont
          donc en second plan, côte à côte comme le duo de la planche 14g.
        */}
        <span className="flex gap-1.5">
          <Link
            href={`/${slug}`}
            className="tactile flex-1 rounded-pilule border-[1.5px] border-texte-principal/25 py-[13px] text-center text-[13px] font-bold hover:border-prune"
          >
            Voir ma page
          </Link>
          <button
            type="submit"
            disabled={enCours}
            className="tactile flex-1 rounded-pilule border-[1.5px] border-texte-principal/25 py-[13px] text-center text-[13px] font-bold hover:border-erreur disabled:opacity-60"
          >
            {enCours ? 'Un instant…' : 'Retirer ma page'}
          </button>
        </span>
        <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
        <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      </form>
    )
  }

  return (
    <form action={action} className="mt-auto flex flex-col gap-2 pt-4 pb-3.5">
      <input type="hidden" name="publier" value="true" />
      <button
        type="submit"
        disabled={enCours || !pret}
        className={`tactile w-full rounded-pilule py-[13px] text-center text-[14px] font-bold text-texte-sur-plein ${
          pret ? 'bg-action hover:bg-action-survol' : 'bg-action/35'
        }`}
      >
        {enCours ? 'Un instant…' : 'Mettre ma page en ligne'}
      </button>
      {pret ? null : (
        <p className="text-center text-[11.5px] text-texte-attenue">
          S’active quand prestations, zone et journées sont posées.
        </p>
      )}
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
    </form>
  )
}
