/**
 * Les faux témoignages de la planche 19a, et **la garde qui les empêche
 * d'atteindre la production**.
 *
 * ⚠️ **Une page de vente avec de faux témoignages en ligne est une faute qu'on
 * ne rattrape pas en s'excusant.** Ils ne sont donc pas écrits en dur dans un
 * composant d'où l'on penserait à les retirer « plus tard » : ils vivent
 * derrière une garde qui **échoue au build** hors développement, sur le modèle
 * des scripts destructifs (`WIGGY_ENV`).
 *
 * Le raisonnement est celui du dépôt : on ne compte pas sur la vigilance là où
 * la structure peut trancher. Personne n'a à se souvenir de les enlever — la
 * production refuse de se construire tant qu'ils sont là.
 *
 * **Comment on s'en débarrasse** : A7 collecte de vrais avis pendant la bêta ;
 * le jour où la table `avis` en contient, la section les lit et ce fichier
 * disparaît avec son appel.
 */

export type Temoignage = { prenom: string; texte: string; contexte: string }

/** Planche 19a, marqués « faux avis assumés » sur la planche elle-même. */
const PLACEHOLDERS: Temoignage[] = [
  {
    prenom: 'Sandrine',
    texte:
      'Le soir, je ne confirme plus rien. Tout est parti tout seul dans la journée, et moi j’ai fini.',
    contexte: '12 ans à domicile · Rezé',
  },
  {
    prenom: 'Awa',
    texte:
      'Le créneau proposé tombe toujours dans le bon quartier. Je n’ai plus de journées en zigzag.',
    contexte: '6 ans à domicile · Nantes',
  },
  {
    prenom: 'Paul',
    texte: 'J’ai photographié mon carnet un dimanche. Le lundi, tout était dedans.',
    contexte: '3 ans à domicile · Vertou',
  },
]

/**
 * Rend les faux témoignages, ou **lève** si l'on n'est pas en développement.
 *
 * Lever plutôt que rendre une liste vide : une liste vide se remarquerait à
 * peine, et la page partirait en ligne avec une section muette dont personne
 * n'aurait su qu'elle contenait des faux. Une exception au build, elle, arrête
 * tout et se lit dans les journaux de déploiement.
 */
export function temoignagesDePlanche(): Temoignage[] {
  const environnement = process.env.WIGGY_ENV
  if (environnement !== 'developpement') {
    throw new Error(
      'Les témoignages de la planche 19a sont des FAUX AVIS. Ils ne peuvent pas partir en ' +
        'production. Branche la section sur les avis réels (A7), ou retire la section. ' +
        `WIGGY_ENV vaut « ${environnement ?? 'rien'} ».`,
    )
  }
  return PLACEHOLDERS
}

/**
 * Y a-t-il des témoignages affichables ici ?
 *
 * C'est cette fonction que la page appelle : elle ne lève pas, elle répond. La
 * section entière disparaît hors développement, plutôt que de laisser la page
 * exploser — la garde arrête les FAUX AVIS, elle ne doit pas casser la page de
 * vente le jour du lancement.
 */
export function sectionAvisAffichable(): boolean {
  return process.env.WIGGY_ENV === 'developpement'
}
