'use client'

import { useEffect } from 'react'
import { mesurerUsageApp } from '@/app/app/usage-actions'

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

    /*
      E3 ⑧ — deux faits que seul le navigateur connaît.

      `display-mode: standalone` : l'app tourne DEPUIS l'écran d'accueil, donc
      elle y a été installée. C'est la seule preuve d'installation qui existe —
      une PWA installée envoie exactement les mêmes requêtes qu'un onglet.

      Le retour du réseau après une coupure : une consultation hors-ligne
      n'envoie rien par définition, elle ne peut se signaler qu'après coup.

      Les deux appels échouent en silence : une mesure ne doit jamais gêner
      l'usage qu'elle mesure.
    */
    if (window.matchMedia('(display-mode: standalone)').matches) {
      void mesurerUsageApp('pwa_installee').catch(() => undefined)
    }
    const auRetour = () => {
      void mesurerUsageApp('consultation_hors_ligne').catch(() => undefined)
    }
    window.addEventListener('online', auRetour)
    return () => {
      window.removeEventListener('online', auRetour)
    }
  }, [])
  return null
}
