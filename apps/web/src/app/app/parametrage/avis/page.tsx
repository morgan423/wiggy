import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, EtatVide, EtiquetteSection } from '@/components/composition'
import { LigneAvis } from './ligne'

/**
 * A7 — la modération des avis, côté pro.
 *
 * **Modération SIMPLE** : publier ou masquer, et c'est tout. Pas de réponse
 * publique — ce serait un fil de discussion, et D18 dit qu'il n'y en a pas.
 *
 * **Un avis masqué n'est pas supprimé.** Masquer et effacer sont deux gestes
 * différents, et l'un se regrette moins que l'autre : une pro qui masque un
 * avis dans un mauvais jour doit pouvoir le republier le lendemain.
 */
export const dynamic = 'force-dynamic'

const quandFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

export default async function Avis() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('avis')
    .select('id, prenom, note, texte, statut, created_at')
    .eq('pro_id', pro.id)
    .order('created_at', { ascending: false })

  const avis = data ?? []
  const aTraiter = avis.filter((a) => a.statut === 'en_attente')
  const traites = avis.filter((a) => a.statut !== 'en_attente')

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle="Profil"
        variante="section"
        statement="Les avis"
        sousTitre="Tu choisis ceux qui s’affichent sur ta page. Rien ne se publie sans toi."
      />
      <CorpsEcran>
        {avis.length === 0 ? (
          <EtatVide
            titre="Pas encore d’avis."
            invitation="Après chaque rendez-vous terminé, ta cliente peut en laisser un depuis son lien de suivi."
          />
        ) : (
          <>
            {aTraiter.length > 0 ? (
              <>
                <EtiquetteSection>À décider</EtiquetteSection>
                {aTraiter.map((a) => (
                  <LigneAvis key={a.id} avis={a} quand={quandFr.format(new Date(a.created_at))} />
                ))}
              </>
            ) : null}
            {traites.length > 0 ? (
              <>
                <EtiquetteSection>Déjà traités</EtiquetteSection>
                {traites.map((a) => (
                  <LigneAvis key={a.id} avis={a} quand={quandFr.format(new Date(a.created_at))} />
                ))}
              </>
            ) : null}
          </>
        )}
      </CorpsEcran>
    </>
  )
}
