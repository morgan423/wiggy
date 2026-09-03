import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { EnteteEcran, CorpsEcran, RangeeEcran } from '@/components/composition'

/**
 * D17 ④ — « Paramétrage », et le mot revient là où on le cherche.
 *
 * Il avait disparu du produit : une pro qui voulait régler quelque chose
 * n'avait plus aucun mot auquel se raccrocher. Il rassemble ce qui se règle
 * rarement et qui ne fait pas tourner l'activité au quotidien.
 *
 * Ce n'est PAS le grenier d'avant : chaque rangée mène à un écran d'un seul
 * sujet, et rien n'est mélangé à l'intérieur.
 */
export default async function Reglages() {
  await requirePro()
  const T = copy.agendaTournee

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={T.$aEcrire.navProfil}
        statement={T.$aEcrire.parametrage}
      />
      <CorpsEcran serre>
        <RangeeEcran principal={T.$aEcrire.paiement} chevron href="/app/parametrage/paiement" />
        <RangeeEcran principal={T.$aEcrire.annulation} chevron href="/app/parametrage/annulation" />
        <RangeeEcran principal={T.$aEcrire.exercice} chevron href="/app/parametrage/exercice" />
        <RangeeEcran
          principal={T.$aEcrire.notifications}
          chevron
          href="/app/parametrage/notifications"
        />
      </CorpsEcran>
    </>
  )
}
