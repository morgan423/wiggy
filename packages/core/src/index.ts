// Domaine partagé entre l'app mobile pro (Expo), la webapp pro et le web
// cliente. Tout ce qui est ici doit rester sans dépendance à un runtime :
// pas de React, pas de Next, pas de Supabase — uniquement des règles métier
// testables.
//
// Les imports portent l'extension .ts explicite : `node --test` en a besoin,
// et Metro comme Turbopack la résolvent sans broncher. Les tsconfig des
// consommateurs activent `allowImportingTsExtensions` pour la même raison.
export * from './tiers.ts'
export * from './payment-terms.ts'
export * from './city.ts'
export * from './money.ts'
export * from './slug.ts'
export * from './copilote.ts'
export * from './durees.ts'
export * from './etats.ts'
export * from './fiche.ts'
export * from './messagerie.ts'
export * from './temps.ts'
export * from './trajets.ts'
export * from './avatar.ts'
export * from './catalogue.ts'
export * from './groupes.ts'
export * from './note-globale.ts'
export * from './distribution-avatars.ts'
export * from './creneaux.ts'
export * from './adresse.ts'
export * from './zone.ts'
export * from './photos.ts'
export * from './selection.ts'
export * from './telephone.ts'
export * from './proposition.ts'
export * from './rappel.ts'
export * from './contrat.ts'
export * from './resume.ts'
export * from './journal.ts'
export * from './parcours.ts'
export * from './contacts.ts'
export * from './score.ts'
export * from './balisage.ts'
export * from './ambassadrices.ts'
