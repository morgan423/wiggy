import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { requirePro } from '@/lib/auth'
import { FormImport } from './form'

/**
 * G3 — l'import du répertoire.
 *
 * **La pièce qui décide de l'adoption** : la clientèle d'une pro existe déjà
 * dans son téléphone, et la saisie manuelle de cent fiches tue l'adoption avant
 * qu'elle commence.
 *
 * ⚠️ **Ce qui est réellement faisable en PWA.** L'API Contact Picker n'existe
 * que sur Chrome Android : **elle n'existe pas sur iOS**, sur aucun navigateur.
 * L'écran propose donc le sélecteur natif QUAND il existe, et l'import de
 * fichier partout ailleurs — c'est ce second chemin qui est le principal, et il
 * est présenté comme tel plutôt que comme un repli honteux.
 */
export const dynamic = 'force-dynamic'

export default async function Importer() {
  await requirePro()
  return (
    <>
      <EnteteEcran
        retour="/app/clientes"
        retourLibelle="Clientes"
        variante="section"
        statement="Tes clientes, sans les retaper"
        sousTitre="Elles sont déjà dans ton téléphone. On les récupère, tu gardes la main sur tout."
      />
      <CorpsEcran>
        <FormImport />
        {/*
          « Aucune migration n'est obligatoire » : le principe est affiché ici
          plutôt que caché dans une aide. Une pro qui croit devoir tout recopier
          avant de commencer ne commence pas.
        */}
        <p className="mt-8 rounded-carte bg-fond px-3.5 py-3 text-[12px] leading-[1.55] text-texte-secondaire">
          <strong className="font-bold text-texte-principal">
            Rien de tout ça n’est obligatoire.
          </strong>{' '}
          Garde ton carnet : chaque réservation crée ou complète une fiche toute seule, et tes
          annotations s’ajoutent au fil des rendez-vous.
        </p>
      </CorpsEcran>
    </>
  )
}
