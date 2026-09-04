'use client'

import { useEffect } from 'react'

/**
 * L'apparition au défilement des pages publiques (règle du 04/09).
 *
 * Chaque bloc marqué `data-apparait` se lève en fondu quand on arrive à son
 * niveau. C'est une page de vente : elle se regarde autrement quand elle se
 * pose bloc après bloc.
 *
 * ⚠️ **C'EST LE SCRIPT QUI CACHE, ET LUI SEUL.** Le HTML sort du serveur
 * entièrement visible ; ce composant ajoute la classe qui masque, puis la
 * retire à l'entrée dans l'écran. L'ordre compte : si l'on posait `opacity: 0`
 * dans le HTML en comptant sur le script pour l'enlever, la moindre erreur de
 * JavaScript rendrait **une page de vente entièrement invisible**. Ici, un
 * script qui ne tourne pas laisse simplement la page telle quelle.
 *
 * **Sous `prefers-reduced-motion`, rien n'est posé du tout** : on ne masque pas
 * pour révéler ensuite sans transition, ce qui produirait un clignotement.
 */
export function Apparitions() {
  useEffect(() => {
    const blocs = [...document.querySelectorAll<HTMLElement>('[data-apparait]')]
    if (blocs.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    for (const bloc of blocs) bloc.classList.add('avant-apparition', 'apparait')

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue
          entree.target.classList.add('apparu')
          // Une fois levé, un bloc ne se recache jamais : réapparaître à chaque
          // passage transformerait la lecture en clignotement.
          observateur.unobserve(entree.target)
        }
      },
      // Le bloc se lève un peu AVANT d'être au centre : déclencher à l'entrée
      // exacte donne une page qui court après le doigt.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )
    for (const bloc of blocs) observateur.observe(bloc)

    /*
      Le premier écran ne s'anime pas : il est déjà là quand la page s'ouvre, et
      le voir se lever donnerait l'impression d'un chargement lent. On le
      découvre à la frame suivante, avant toute peinture visible.
    */
    requestAnimationFrame(() => {
      for (const bloc of blocs) {
        if (bloc.getBoundingClientRect().top < window.innerHeight * 0.9) {
          bloc.classList.add('apparu')
          observateur.unobserve(bloc)
        }
      }
    })

    return () => {
      observateur.disconnect()
    }
  }, [])
  return null
}
