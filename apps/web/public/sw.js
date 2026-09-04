/*
  C9 ② et ③ — le service worker de Wiggy.

  DEUX MISSIONS, ET AUCUNE AUTRE :
    ② rendre la TOURNÉE DU JOUR consultable hors-ligne ;
    ③ recevoir les notifications push.

  Ce n'est pas un cache général. « Tout mettre en cache » sur une app de
  réservation, c'est montrer un créneau libre qui ne l'est plus, et envoyer une
  pro chez une cliente qui a annulé. On met donc en cache CE QUI SE CONSULTE et
  jamais ce qui s'écrit.
*/

const VERSION = 'wiggy-v1'
const TOURNEE = `${VERSION}-tournee`
const STATIQUE = `${VERSION}-statique`

// Les chemins dont la dernière version consultée doit survivre au réseau.
const HORS_LIGNE = ['/app/tournee', '/app/agenda']

self.addEventListener('install', (evenement) => {
  // On prend la main tout de suite : une pro qui vient d'installer l'app et
  // qui entre en zone blanche dans la minute ne doit pas attendre un
  // rechargement pour être couverte.
  self.skipWaiting()
  evenement.waitUntil(caches.open(STATIQUE))
})

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    (async () => {
      // Les caches d'une version précédente sont jetés : garder l'ancien
      // reviendrait à servir un jour l'écran d'avant-hier.
      const noms = await caches.keys()
      await Promise.all(noms.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request
  // ⚠️ On ne touche JAMAIS à autre chose qu'une lecture. Une écriture rejouée
  // depuis un cache créerait un second rendez-vous, une seconde clôture, une
  // seconde annulation. Le hors-ligne en écriture attend le natif (C8).
  if (requete.method !== 'GET') return

  const url = new URL(requete.url)
  if (url.origin !== self.location.origin) return

  const estUnEcran = HORS_LIGNE.some((chemin) => url.pathname.startsWith(chemin))
  if (estUnEcran) {
    evenement.respondWith(reseauPuisCache(requete))
    return
  }

  // Les fichiers versionnés de Next : leur nom change à chaque déploiement,
  // donc les servir depuis le cache ne peut pas servir une version périmée.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/polices/')) {
    evenement.respondWith(cachePuisReseau(requete))
  }
})

/**
 * Le réseau d'abord, le cache en secours.
 *
 * C'est l'ordre qui compte : la tournée du jour DOIT être fraîche quand le
 * réseau existe. Servir le cache en premier montrerait une journée périmée à
 * une pro parfaitement connectée, ce qui serait pire que pas de hors-ligne du
 * tout — elle ne saurait pas qu'elle regarde une photo ancienne.
 */
async function reseauPuisCache(requete) {
  const cache = await caches.open(TOURNEE)
  try {
    const reponse = await fetch(requete)
    /*
      ⚠️ LA MISE EN CACHE NE DOIT JAMAIS POUVOIR FAIRE ÉCHOUER LA RÉPONSE.

      Premier écrit, ce bloc mettait le `cache.put` dans le même `try` que le
      `fetch`. Or `cache.put` REFUSE une réponse redirigée : une pro déconnectée
      demandait sa tournée, la redirection vers la connexion faisait lever le
      cache, et on tombait dans le secours hors-ligne alors que le réseau
      marchait parfaitement. Constaté par `npm run pwa:check`, pas deviné.

      On ne met donc en cache que ce qui se met en cache, et jamais au prix de
      la réponse : une redirection vers la connexion n'a de toute façon rien à
      faire dans le cache de la tournée, elle y masquerait la vraie journée.
    */
    if (reponse.ok && !reponse.redirected) {
      cache.put(requete, reponse.clone()).catch(() => {})
    }
    return reponse
  } catch {
    const garde = await cache.match(requete)
    if (garde) return garde
    // Rien en cache : on le DIT. Une page blanche laisse croire à une panne de
    // l'app, alors que c'est le réseau qui manque.
    return new Response(PAGE_HORS_LIGNE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function cachePuisReseau(requete) {
  const cache = await caches.open(STATIQUE)
  const garde = await cache.match(requete)
  if (garde) return garde
  const reponse = await fetch(requete)
  // Même raison qu'au-dessus : le cache ne met jamais la réponse en péril.
  if (reponse.ok && !reponse.redirected) cache.put(requete, reponse.clone()).catch(() => {})
  return reponse
}

/* ── ③ Le push ────────────────────────────────────────────────────────── */

self.addEventListener('push', (evenement) => {
  if (!evenement.data) return
  let charge
  try {
    charge = evenement.data.json()
  } catch {
    return
  }
  evenement.waitUntil(
    self.registration.showNotification(charge.titre ?? 'Wiggy', {
      body: charge.corps ?? '',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      // Le lien voyage dans la notification : au clic, on ouvre l'écran dont
      // elle parle, jamais l'accueil.
      data: { lien: charge.lien ?? '/app/notifications' },
      // Deux notifications sur le même sujet se remplacent au lieu de
      // s'empiler : une pro qui sort d'une prestation ne doit pas trouver
      // quatorze pastilles pour la même journée.
      tag: charge.lien ?? 'wiggy',
      renotify: false,
    }),
  )
})

self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close()
  const lien = evenement.notification.data?.lien ?? '/app/notifications'
  evenement.waitUntil(
    (async () => {
      // Si Wiggy est déjà ouvert quelque part, on y NAVIGUE plutôt que d'ouvrir
      // un second onglet : deux Wiggy ouverts, c'est deux agendas qui divergent.
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const fenetre of fenetres) {
        if (new URL(fenetre.url).origin === self.location.origin) {
          await fenetre.focus()
          return fenetre.navigate(lien)
        }
      }
      return self.clients.openWindow(lien)
    })(),
  )
})

const PAGE_HORS_LIGNE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title>
<style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
background:#FBEEE6;color:#45173C;font-family:system-ui,-apple-system,sans-serif;padding:24px}
div{max-width:20rem}h1{font-size:20px;margin:0 0 8px}p{font-size:14px;line-height:1.5;
color:rgba(69,23,60,.72);margin:0}</style></head><body><div>
<h1>Pas de réseau ici.</h1>
<p>Ta tournée du jour reste consultable si tu l'as ouverte avant de partir. Sinon, elle
reviendra dès que tu auras du signal.</p></div></body></html>`
