import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@wiggy/api'

/**
 * Rafraîchit la session à chaque navigation et ferme l'espace pro.
 *
 * Next 16 : le fichier s'appelle `proxy` (ex-`middleware`) et tourne sur le
 * runtime Node.
 *
 * ⚠️ Ce garde-barrière est un confort de navigation, pas la sécurité : la
 * sécurité, c'est la RLS et la vérification serveur dans chaque page. Un défaut
 * ici ne doit jamais suffire à exposer une donnée.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Sans configuration, on laisse passer : le proxy s'applique à TOUTES les
  // routes, et le site public n'a aucune raison de tomber parce que la base
  // n'est pas branchée. Les pages de l'espace pro, elles, échoueront d'elles-
  // mêmes avec un message explicite.
  if (!url || !cle) return response

  const supabase = createServerClient<Database>(url, cle, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Une panne d'authentification ne doit pas rendre le site public inaccessible.
  // Laisser passer est sans danger : la vraie barrière est `requirePro()` dans
  // chaque page, doublée de la RLS.
  const utilisateur = await supabase.auth
    .getUser()
    .then(({ data }) => data.user)
    .catch(() => null)

  const versEspacePro = request.nextUrl.pathname.startsWith('/app')

  if (versEspacePro && !utilisateur) {
    const connexion = request.nextUrl.clone()
    connexion.pathname = '/connexion'
    connexion.searchParams.set('suite', request.nextUrl.pathname)
    return NextResponse.redirect(connexion)
  }

  return response
}

export const config = {
  // On évite les fichiers statiques et les images : rien à protéger, et un
  // aller-retour Supabase par icône serait absurde.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif)$).*)'],
}
