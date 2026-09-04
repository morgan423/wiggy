/*
  C9 ② et ③ — le service worker de Wiggy.

  DEUX MISSIONS, ET AUCUNE AUTRE :
    ② rendre la JOURNÉE consultable hors-ligne : la tournée, l'agenda, ET LES
       FICHES DES CLIENTES DU JOUR ;
    ③ recevoir les notifications push.

  ⚠️ LES FICHES SONT LE CAS D'USAGE LE PLUS FORT, et elles manquaient. En zone
  blanche chez une cliente, la pro n'a pas besoin de son agenda : elle est déjà
  sur place. Elle a besoin de la formule couleur et du temps de pose de la
  personne assise devant elle. C8 le disait, D4 l'avait avancé dans C9, et le
  cadrage s'était rétréci entre les deux.

  Ce n'est pas un cache général. « Tout mettre en cache » sur une app de
  réservation, c'est montrer un créneau libre qui ne l'est plus, et envoyer une
  pro chez une cliente qui a annulé. On met donc en cache CE QUI SE CONSULTE et
  jamais ce qui s'écrit.
*/

const VERSION = 'wiggy-v2'
const STATIQUE = `${VERSION}-statique`

/*
  LE CACHE DU JOUR PORTE SA DATE, et c'est ce qui le fait expirer tout seul.

  Une fiche mise en cache hier n'a aucune raison d'être lisible aujourd'hui : la
  pro n'est plus chez cette cliente. Le nom du cache contient donc la date, et
  tout cache d'un autre jour est supprimé au premier passage. Aucune tâche
  planifiée : une purge liée à l'usage se répare d'elle-même, une tâche qui ne
  tourne plus laisse grossir sans que personne le voie.
*/
const jourCourant = () => new Date().toISOString().slice(0, 10)
const cacheDuJour = () => `${VERSION}-jour-${jourCourant()}`

// Les chemins dont la dernière version consultée doit survivre au réseau.
// `/app/clientes/` en fait partie : c'est la fiche, le cœur du hors-ligne.
const HORS_LIGNE = ['/app/tournee', '/app/agenda', '/app/clientes/']

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
      const garder = [STATIQUE, cacheDuJour()]
      await Promise.all(noms.filter((n) => !garder.includes(n)).map((n) => caches.delete(n)))
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
  await purgerLesAutresJours()
  const cache = await caches.open(cacheDuJour())
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

/** Tout cache d'un autre jour s'en va. Appelée à chaque lecture : gratuite. */
async function purgerLesAutresJours() {
  const garder = [STATIQUE, cacheDuJour()]
  const noms = await caches.keys()
  await Promise.all(noms.filter((n) => !garder.includes(n)).map((n) => caches.delete(n)))
}

/*
  ── Les messages de la page ───────────────────────────────────────────────

  `precharger` : la pro consulte sa tournée AVANT de partir, encore connectée.
  C'est le seul moment où l'on peut remplir le cache — en zone blanche, il est
  trop tard. La page envoie les adresses des fiches du jour, le worker les va
  chercher.

  `oublier` : la DÉCONNEXION. Un cache qui survit à un logout est un défaut, et
  celui-ci contient des notes techniques de clientes nommées. Tout part.
*/
self.addEventListener('message', (evenement) => {
  const message = evenement.data
  if (!message || typeof message !== 'object') return

  if (message.type === 'precharger' && Array.isArray(message.chemins)) {
    evenement.waitUntil(
      (async () => {
        await purgerLesAutresJours()
        const cache = await caches.open(cacheDuJour())
        await Promise.all(
          message.chemins.slice(0, 40).map(async (chemin) => {
            try {
              const reponse = await fetch(chemin, { credentials: 'same-origin' })
              if (reponse.ok && !reponse.redirected) await cache.put(chemin, reponse)
            } catch {
              // Hors ligne au moment du préchargement : on ne fait rien. La
              // fiche déjà en cache reste, et l'échec ne se signale pas.
            }
          }),
        )
      })(),
    )
    return
  }

  if (message.type === 'oublier') {
    evenement.waitUntil(
      (async () => {
        const noms = await caches.keys()
        await Promise.all(noms.map((n) => caches.delete(n)))
      })(),
    )
  }
})

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
