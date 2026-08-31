import type { MetadataRoute } from 'next'

/**
 * S3 — rien de fictif ni de privé ne doit être indexé.
 *
 * Les pages pro publiques sont indexables (c'est le moteur d'acquisition
 * organique, A2), mais uniquement lorsqu'elles sont publiées : le contrôle se
 * fait page par page via `robots: { index: false }` sur les fiches non
 * publiées, pas ici.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.wiggy.fr'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/api/', '/auth/', '/inscription', '/connexion'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
