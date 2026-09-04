'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { copy } from '@wiggy/copy'
import { supabaseServer } from '@/lib/supabase/server'
import { champ } from '@/lib/forms'
import { aFaireAccepter, verifierEtEnregistrer } from '@/lib/legal'

/**
 * Authentification du pro. Registre : tutoiement (S6).
 *
 * Les messages d'erreur restent volontairement génériques à la connexion :
 * distinguer « e-mail inconnu » de « mot de passe faux » revient à confirmer
 * l'existence d'un compte à qui demande.
 */

export type EtatAuth = { statut: 'vide' | 'erreur' | 'verifie_tes_mails'; message?: string }

const Identifiants = z.object({
  email: z.email('Cette adresse e-mail semble incomplète.'),
  motDePasse: z.string().min(1, 'Saisis ton mot de passe.'),
  suite: z.string().optional(),
})

const Inscription = z.object({
  nom: z.string().trim().min(1, 'Indique ton nom professionnel.').max(80),
  email: z.email('Cette adresse e-mail semble incomplète.'),
  // La spécification 14b tranche à 8 : c'est elle qui fait foi pour les écrans.
  motDePasse: z.string().min(8, copy.validation.$aEcrire.proMotDePasseCourt),
})

export async function seConnecter(_precedent: EtatAuth, donnees: FormData): Promise<EtatAuth> {
  const saisie = Identifiants.safeParse({
    email: champ(donnees, 'email'),
    motDePasse: champ(donnees, 'motDePasse'),
    suite: champ(donnees, 'suite') ?? undefined,
  })
  if (!saisie.success) return { statut: 'erreur', message: saisie.error.issues[0].message }

  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({
    email: saisie.data.email,
    password: saisie.data.motDePasse,
  })
  if (error) {
    return { statut: 'erreur', message: 'E-mail ou mot de passe incorrect.' }
  }

  redirect(destinationSure(saisie.data.suite))
}

export async function sInscrire(_precedent: EtatAuth, donnees: FormData): Promise<EtatAuth> {
  const saisie = Inscription.safeParse({
    nom: champ(donnees, 'nom'),
    email: champ(donnees, 'email'),
    motDePasse: champ(donnees, 'motDePasse'),
  })
  if (!saisie.success) return { statut: 'erreur', message: saisie.error.issues[0].message }

  /*
    G7 ① — les CGV et la confidentialité.

    L'ORDRE COMPTE, et il n'est pas celui qu'on croit. On vérifie les cases
    AVANT de créer le compte, et on enregistre la preuve APRÈS : il n'existe
    pas d'identifiant à qui rattacher une acceptation tant que le compte
    n'existe pas. Vérifier d'abord évite de créer un compte qu'il faudrait
    ensuite refuser.

    Le contrôle est refait ici et pas seulement à l'affichage : un formulaire
    envoyé sans passer par nos écrans ne coche rien du tout, et c'est
    exactement le cas qu'il faut arrêter.
  */
  const aAccepter = await aFaireAccepter('inscription_pro')
  const manquant = aAccepter.find(
    ({ document }) =>
      document === null || donnees.get(`accepte:${document.slug}:${document.version}`) === null,
  )
  if (manquant) {
    return {
      statut: 'erreur',
      message:
        aAccepter.length > 1
          ? 'Il faut accepter les conditions et la politique de confidentialité pour continuer.'
          : 'Il faut accepter les conditions pour continuer.',
    }
  }

  const supabase = await supabaseServer()
  const { data, error } = await supabase.auth.signUp({
    email: saisie.data.email,
    password: saisie.data.motDePasse,
    options: { data: { display_name: saisie.data.nom } },
  })

  if (error) {
    console.error('inscription_failed', error.code)
    return { statut: 'erreur', message: 'Impossible de créer le compte pour le moment.' }
  }

  /*
    La preuve, maintenant que le compte existe.

    Elle vise `auth.users` et non `pros`, dont la fiche n'est créée qu'au
    premier accès authentifié : une acceptation qui attendrait la fiche serait
    une acceptation qu'on n'a pas au moment où elle est donnée.

    ⚠️ On n'envoie PAS d'horodatage : le déclencheur de 0021 impose celui du
    serveur. C'est la base qui tient la règle, pas ce fichier.
  */
  if (data.user) {
    const trace = await verifierEtEnregistrer('inscription_pro', donnees, { userId: data.user.id })
    if (!trace.ok) {
      // Le compte existe déjà à ce stade. On le dit plutôt que de laisser
      // croire à un échec total : la pro se connectera, et l'acceptation lui
      // sera redemandée puisqu'elle n'est pas enregistrée.
      console.error('inscription_sans_preuve', data.user.id)
    }
  }

  // Sans session, la confirmation d'e-mail est activée sur le projet : la
  // fiche pro sera créée au premier accès authentifié (cf. lib/auth.ts).
  if (!data.session) return { statut: 'verifie_tes_mails' }

  // D9 : l'inscription enchaîne directement sur les deux vérifications,
  // téléphone puis e-mail. La page ne se met pas en ligne avant les deux.
  redirect('/verification/telephone')
}

export async function seDeconnecter() {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/')
}

/**
 * N'accepte qu'un chemin interne : un paramètre `suite` contrôlé par un tiers
 * ne doit pas pouvoir rediriger vers un site externe.
 */
function destinationSure(suite: string | undefined): string {
  // Un seul `/` suivi d'autre chose qu'un `/` ou un `\` : `//site.fr` et
  // `/\site.fr` sont tous deux interprétés comme des URL externes par les
  // navigateurs.
  return suite && /^\/[^/\\]/.test(suite) ? suite : '/app'
}
