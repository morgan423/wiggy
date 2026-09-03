import {
  EnteteEcran,
  CorpsEcran,
  EtiquetteSection,
  RangeeSquelette,
} from '@/components/composition'

/**
 * Le chargement du hub, planche 14c, troisième état.
 *
 * Squelette sur la carte, pulsation d'opacité, jamais de rotateur plein écran
 * (état transverse défini en 14a, jamais redessiné ailleurs). Le bandeau prune
 * et son statement sont déjà là : ce qui charge, ce sont les résumés, et
 * l'écran ne saute pas quand ils arrivent.
 */
export default function ChargementParametrage() {
  return (
    <>
      <EnteteEcran variante="hub" statement="Ton activité." />
      <CorpsEcran>
        <EtiquetteSection>Prestations</EtiquetteSection>
        <RangeeSquelette />
        <EtiquetteSection>Zone d’intervention</EtiquetteSection>
        <RangeeSquelette largeurs={['55%', '30%']} />
      </CorpsEcran>
    </>
  )
}
