import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Galerie } from './galerie'

/**
 * La galerie de la trousse : chaque composant, dans tous ses états.
 *
 * Elle existe pour qu'une relecture de design se fasse en une fois, au lieu de
 * chasser les composants d'écran en écran. Elle n'affiche **aucune donnée
 * réelle** : tout ce qu'on y lit est inventé, et se voit comme tel.
 *
 * Elle n'est pas accessible en production. La garde est en liste blanche, pas
 * en liste noire : seule la valeur `developpement` ouvre la page, une variable
 * absente ou mal orthographiée la ferme. Se tromper doit fermer, jamais ouvrir.
 */

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function PageGalerie() {
  if (process.env.WIGGY_ENV !== 'developpement') notFound()
  return <Galerie />
}
