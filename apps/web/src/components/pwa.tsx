'use client'

import { useEffect } from 'react'

/**
 * C9 — l'enregistrement du service worker.
 *
 * Il vit dans le layout de l'espace pro et non à la racine du site : la page
 * publique d'une pro et le tunnel de réservation n'ont RIEN à mettre en cache.
 * Une cliente qui réserve doit voir des créneaux frais, et un service worker
 * sur son parcours ne pourrait que lui montrer un créneau déjà pris.
 */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // `catch` silencieux : un service worker qui ne s'enregistre pas (navigation
    // privée, réglage du navigateur) ne doit rien casser. L'app reste
    // parfaitement utilisable en ligne, elle perd seulement le hors-ligne.
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])
  return null
}
