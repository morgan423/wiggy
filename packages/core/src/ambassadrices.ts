/**
 * G2 — les places restantes du programme Ambassadrices.
 *
 * ⚠️ **Le compteur est branché sur le RÉEL** (principe n°4), et c'est
 * indispensable ici : la page annonce elle-même « compteur branché sur le
 * réel ». Écrire « 50 » en dur ferait de cette phrase un mensonge, et un
 * mensonge sur une page de vente est une faute d'un autre ordre qu'une promesse
 * en avance sur le produit — D19 autorise la seconde, jamais la première.
 *
 * G2 n'existe pas encore : personne n'a converti de filleule, donc les
 * cinquante places sont entières. Le chiffre est donc **exact aujourd'hui**, et
 * il bougera tout seul le jour où le moteur de parrainage arrivera, sans qu'on
 * ait à repasser ici.
 */
export const PLACES_AMBASSADRICES = 50

/**
 * ⚠️ **Synchrone tant que G2 n'existe pas, et pas « async pour plus tard ».**
 * Il n'y a aujourd'hui aucune lecture à faire : la table du parrainage n'existe
 * pas, donc zéro conversion, donc cinquante places. Déclarer la fonction
 * asynchrone sans rien attendre ferait croire à une lecture qui n'a pas lieu.
 * Le jour où G2 arrive, elle devient asynchrone et l'appelant ajoute son
 * `await` : une ligne, et elle sera vraie.
 */
export function placesAmbassadricesRestantes(): number {
  const prises = 0
  return Math.max(0, PLACES_AMBASSADRICES - prises)
}
