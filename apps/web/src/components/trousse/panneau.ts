'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Le comportement commun à tout ce qui s'ouvre sous un champ.
 *
 * Fermeture à l'échappement et au clic dehors : ce sont les deux gestes que
 * tout le monde essaie, et les oublier donne un panneau collant dont on ne
 * sait plus comment sortir. Écrit une fois plutôt que dans chaque composant,
 * pour que la liste, le calendrier et les suggestions se ferment pareil.
 */
export function usePanneau<T extends HTMLElement>() {
  const [ouvert, setOuvert] = useState(false)
  const contenant = useRef<T>(null)

  useEffect(() => {
    if (!ouvert) return

    const auClic = (e: MouseEvent) => {
      if (!contenant.current?.contains(e.target as Node)) setOuvert(false)
    }
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  return { ouvert, setOuvert, contenant }
}
