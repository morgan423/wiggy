import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, EtatVide } from '@/components/composition'
import { FormPrestation } from './form'
import { RangeePrestation } from './rangee'
import { Groupes } from './groupes'

export default async function Prestations() {
  await requirePro()
  const supabase = await supabaseServer()
  const { data: prestations } = await supabase
    .from('services')
    .select(
      'id, name, price_cents, duration_min, deposit_percent, category, photos_required, active',
    )
    /*
      ⚠️ UN DÉPARTAGE FINAL SUR L'IDENTIFIANT, ET CE N'EST PAS DE LA COQUETTERIE.

      `position` vaut 0 pour toutes les prestations — la colonne existe mais
      rien ne l'attribue — et `created_at` est identique quand plusieurs
      prestations naissent d'une même insertion. Les deux critères ne
      départagent alors RIEN, et Postgres rend les lignes dans l'ordre qui
      l'arrange : celui du tas, qui CHANGE après chaque écriture.

      Constaté en vérifiant ce lot : après une édition, la liste s'était
      réordonnée toute seule. Ça n'a l'air de rien sur un écran de
      paramétrage ; c'est grave sur la page publique, où 20a fait dépendre
      l'ordre des groupes de « l'ordre de première apparition dans SA liste ».
      Une pro voyait donc ses groupes changer de place sans avoir rien
      demandé.

      L'identifiant départage toujours et ne bouge jamais : l'ordre devient
      STABLE. Il n'est pas encore CHOISI — un vrai réordonnancement demanderait
      d'attribuer `position`, et c'est une fonctionnalité, pas un correctif.
    */
    .order('position')
    .order('created_at')
    .order('id')

  const liste = prestations ?? []

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Ce que tu proposes." />
      <CorpsEcran serre>
        {liste.length === 0 ? (
          <EtatVide
            titre="Ta liste est vide."
            invitation="Ajoute ta première prestation : deux minutes suffisent, tu pourras tout retoucher."
          >
            <FormPrestation premiere prestations={liste} />
          </EtatVide>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {liste.map((p) => (
                /*
                  La rangée est un composant client : c'est elle qui ouvre la
                  feuille d'édition en place. Elle reçoit TOUTE la liste, parce
                  que les groupes proposés dans la feuille se déduisent des
                  prestations de la pro — il n'existe aucune table de groupes.
                */
                <RangeePrestation key={p.id} prestation={p} prestations={liste} />
              ))}
            </ul>
            <FormPrestation prestations={liste} />
            {/* Le renommage, qui met à jour toutes les prestations d'un groupe
                en une fois. La section n'existe que s'il y a des groupes. */}
            <Groupes prestations={liste} />
          </>
        )}
      </CorpsEcran>
    </>
  )
}
