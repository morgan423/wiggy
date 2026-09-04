'use client'

import { useEffect, useState } from 'react'
import { RANGEE } from '@/components/composition'
import { enregistrerAbonnement, oublierAbonnement } from './actions'

/**
 * C9 ③ — l'abonnement de CET appareil aux notifications push.
 *
 * **Un abonnement par appareil**, et c'est pour cela que le bouton parle de
 * « cet appareil » : une pro a son téléphone et son ordinateur du soir (D3).
 * Autoriser sur l'un n'autorise pas l'autre, et laisser croire le contraire
 * ferait manquer un rappel de départ.
 *
 * ⚠️ **On ne demande JAMAIS la permission au chargement.** Un navigateur qui
 * voit une demande non sollicitée la refuse définitivement sur certains
 * réglages, et la pro n'a alors plus aucun moyen de revenir en arrière depuis
 * l'app. On demande au clic, quand elle vient de dire qu'elle veut.
 */
export function AbonnementAppareil({ clePublique }: { clePublique: string | null }) {
  const [etat, setEtat] = useState<'inconnu' | 'absent' | 'actif' | 'refuse' | 'impossible'>(
    'inconnu',
  )
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEtat('impossible')
      return
    }
    if (Notification.permission === 'denied') {
      setEtat('refuse')
      return
    }
    void navigator.serviceWorker.ready
      .then((sw) => sw.pushManager.getSubscription())
      .then((abonnement) => {
        setEtat(abonnement ? 'actif' : 'absent')
      })
      .catch(() => {
        setEtat('impossible')
      })
  }, [])

  async function activer() {
    if (!clePublique) return
    setEnCours(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setEtat(permission === 'denied' ? 'refuse' : 'absent')
        return
      }
      const sw = await navigator.serviceWorker.ready
      const abonnement = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: versOctets(clePublique),
      })
      const brut = abonnement.toJSON()
      await enregistrerAbonnement({
        endpoint: abonnement.endpoint,
        p256dh: brut.keys?.p256dh ?? '',
        auth: brut.keys?.auth ?? '',
        appareil: navigator.userAgent.slice(0, 120),
      })
      setEtat('actif')
    } catch {
      setEtat('impossible')
    } finally {
      setEnCours(false)
    }
  }

  async function desactiver() {
    setEnCours(true)
    try {
      const sw = await navigator.serviceWorker.ready
      const abonnement = await sw.pushManager.getSubscription()
      if (abonnement) {
        await oublierAbonnement(abonnement.endpoint)
        await abonnement.unsubscribe()
      }
      setEtat('absent')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className={`${RANGEE} mt-5 items-start`}>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[13.5px] leading-[1.35] font-bold">Cet appareil</span>
        <span className="text-[11.5px] leading-[1.4] text-texte-attenue">{MESSAGE[etat]}</span>
      </span>
      {etat === 'absent' ? (
        <button
          type="button"
          disabled={enCours || !clePublique}
          onClick={() => void activer()}
          className="tactile shrink-0 rounded-pilule bg-action px-4 text-[12.5px] font-bold text-texte-sur-plein hover:bg-action-survol disabled:bg-action-pressee"
        >
          {enCours ? 'Un instant…' : 'Autoriser'}
        </button>
      ) : etat === 'actif' ? (
        <button
          type="button"
          disabled={enCours}
          onClick={() => void desactiver()}
          className="tactile shrink-0 rounded-pilule border-2 border-trait-discret px-4 text-[12.5px] font-bold"
        >
          Retirer
        </button>
      ) : null}
    </div>
  )
}

const MESSAGE: Record<string, string> = {
  inconnu: 'Vérification…',
  absent: 'Reçois les alertes même quand Wiggy est fermé.',
  actif: 'Cet appareil reçoit les notifications.',
  // On dit où aller : « refusé » sans la suite est une impasse, et la pro ne
  // devinera pas que la décision se reprend dans les réglages du navigateur.
  refuse:
    'Tu as refusé les notifications sur cet appareil. Ça se rouvre dans les réglages de ton navigateur, à la ligne Wiggy.',
  impossible: 'Cet appareil ou ce navigateur ne sait pas recevoir de notifications.',
}

/**
 * La clé VAPID voyage en base64 « URL » ; `PushManager` veut des octets bruts.
 * Sans cette conversion, l'abonnement échoue avec une erreur qui ne dit rien.
 */
function versOctets(base64: string): ArrayBuffer {
  const complet = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const brut = atob(complet)
  return Uint8Array.from(brut, (c) => c.charCodeAt(0)).buffer
}
