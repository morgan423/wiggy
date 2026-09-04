'use client'

import { useEffect } from 'react'

/**
 * C9 ② — précharge les fiches des clientes DU JOUR pendant qu'il y a du réseau.
 *
 * **C'est le seul moment où l'on peut le faire.** En zone blanche chez une
 * cliente, il est trop tard : une fiche qu'on n'a pas mise en cache avant de
 * partir ne s'y mettra pas toute seule. La pro consulte sa tournée le matin,
 * encore connectée — c'est là qu'on remplit.
 *
 * Seules les fiches du jour partent en cache, jamais le carnet entier : c'est ce
 * qu'exige le métier, et c'est aussi ce qui borne ce qu'on écrit sur le
 * téléphone.
 */
export function PrechargerLesFiches({ chemins }: { chemins: string[] }) {
  useEffect(() => {
    if (chemins.length === 0 || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.ready
      .then((sw) => {
        sw.active?.postMessage({ type: 'precharger', chemins })
      })
      .catch(() => undefined)
  }, [chemins])
  return null
}

/**
 * C9 ② — vide TOUT le cache à la déconnexion.
 *
 * ⚠️ **Un cache qui survit à un logout est un défaut**, et celui-ci contient des
 * notes techniques de clientes nommées. Se déconnecter doit vouloir dire que
 * l'appareil n'en garde rien.
 *
 * L'effacement se fait AVANT l'envoi du formulaire : une fois la redirection
 * partie, la page est démontée et le message ne serait jamais posté. On ne
 * bloque pas la déconnexion si l'effacement échoue — mieux vaut être déconnectée
 * avec un cache tenace que rester connectée.
 */
export function BoutonDeconnexion({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      onClick={() => {
        void (async () => {
          try {
            const sw = await navigator.serviceWorker.ready
            sw.active?.postMessage({ type: 'oublier' })
            // Effacement direct en plus du message : si le worker ne répond
            // plus, la page sait encore effacer elle-même.
            const noms = await caches.keys()
            await Promise.all(noms.map((n) => caches.delete(n)))
          } catch {
            // Rien : la déconnexion prime.
          }
        })()
      }}
      className="tactile block w-full rounded-champ px-3 py-2.5 text-left text-[13px] font-bold text-erreur"
    >
      {children}
    </button>
  )
}
