import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { FormBlocage } from './form'

/**
 * B4 — bloquer une plage.
 *
 * Le pilier de « l'app propose, le pro dispose ». Tant que la synchronisation
 * d'agenda n'existe pas (D2, décidée par le terrain), c'est l'outil qui permet
 * à une pro de protéger son rendez-vous chez le dentiste, la sortie d'école, ou
 * une matinée qu'elle veut simplement garder pour elle.
 */
export default async function Bloquer() {
  await requirePro()
  const T = copy.agendaTournee
  return (
    <>
      <EnteteEcran
        retour="/app/agenda"
        retourLibelle={T.rendezVous.retour}
        variante="jour"
        statement={T.$aEcrire.blocageTitre}
        sousTitre={T.$aEcrire.blocageAide}
      />
      <CorpsEcran serre>
        <FormBlocage />
      </CorpsEcran>
    </>
  )
}
