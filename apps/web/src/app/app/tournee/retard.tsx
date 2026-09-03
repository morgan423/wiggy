'use client'

import { useActionState, useState } from 'react'
import { copy, remplir } from '@wiggy/copy'
import { ZONE, heureDArriveeEstimee } from '@wiggy/core'
import { Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { BoutonPointille } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { prevenirDuRetard } from '@/app/app/agenda/actions'

/**
 * C5 — « Je suis en retard », en un tap, mais jamais en un tap tout seul.
 *
 * ⚠️ **Le message se PRÉVISUALISE et se VALIDE.** C'est le principe non
 * négociable n°1, et il n'a pas d'exception. Ce qui est automatisé, c'est
 * l'écriture : la pro n'a plus à taper un SMS au volant, ni à calculer une
 * heure d'arrivée au jugé. Ce qui reste à elle, c'est l'envoi.
 *
 * L'heure annoncée vient du TRAJET EN COURS, pas d'une estimation de comptoir,
 * et le retard s'arrondit vers le haut : annoncer dix minutes et en mettre
 * vingt fait plus de dégâts qu'annoncer un quart d'heure et arriver en avance.
 *
 * G4 : le message ouvre par la pro et porte son numéro, parce qu'il appelle une
 * réponse.
 */

const heureFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

export function FormRetard({
  id,
  cliente,
  prenomPro,
  telephonePro,
  minutesTrajet,
}: {
  id: string
  cliente: string
  prenomPro: string
  telephonePro: string | null
  minutesTrajet: number | null
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(prevenirDuRetard, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const T = copy.agendaTournee

  if (!ouvert) {
    return (
      <BoutonPointille
        onClick={() => {
          setOuvert(true)
        }}
      >
        {T.$aEcrire.retard}
      </BoutonPointille>
    )
  }

  // L'heure d'arrivée se calcule à l'ouverture du formulaire, pas au montage de
  // l'écran : c'est au moment où la pro décide de prévenir qu'elle est juste.
  const arrivee = heureDArriveeEstimee(new Date(), minutesTrajet ?? 0)
  const propose = remplir(T.$aEcrire.retardSms, {
    cliente,
    pro: prenomPro,
    heure: heureFr.format(arrivee),
    telephone: telephonePro ?? '',
  })

  return (
    <form action={action} key={etat.n} className="w-full">
      <input type="hidden" name="id" value={id} />
      <Zone
        id="texte"
        label={T.$aEcrire.retardTitre}
        defaultValue={propose}
        rows={4}
        aide={T.$aEcrire.retardAide}
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>{T.$aEcrire.retardEnvoyer}</BoutonPrincipal>
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
