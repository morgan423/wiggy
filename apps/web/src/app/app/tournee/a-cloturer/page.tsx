import { ZONE, aRelancer } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { requireCapability } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, EtatVide } from '@/components/composition'
import { FormCloture } from './form'

/**
 * D15 — le rattrapage du soir, en plein droit.
 *
 * Ce n'est pas un écran de rattrapage d'erreur : c'est le geste réel du métier.
 * La pro coiffe toute la journée et remplit ses fiches le soir. La tournée
 * reste donc actionnable après coup, et la clôture accepte d'être faite plus
 * tard.
 *
 * ⚠️ **Aucune clôture automatique, jamais**, même après des semaines : ce
 * serait réintroduire le mensonge que D15 corrige. L'app cesse simplement de
 * réclamer au bout de sept jours. On propose, on ne harcèle pas.
 */

const T = copy.agendaTournee

const quand = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function ACloturer() {
  await requireCapability('tour_copilot')
  const supabase = await supabaseServer()

  const { data: ouverts } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, ends_at, service_name, note, clients(first_name, last_name, technical_notes)',
    )
    .lt('ends_at', new Date().toISOString())
    .not('status', 'in', '(done,cancelled)')
    .order('starts_at', { ascending: false })
    .limit(50)

  const liste = aRelancer(
    (ouverts ?? []).map((r) => ({ ...r, cloture: false, fin: new Date(r.ends_at) })),
    new Date(),
  )

  return (
    <>
      <EnteteEcran
        retour="/app/tournee"
        retourLibelle="Ma tournée"
        variante="jour"
        statement={T.$aEcrire.aCloturerTitre}
        sousTitre={T.$aEcrire.aCloturerAide}
      />
      <CorpsEcran serre>
        {liste.length === 0 ? (
          <EtatVide invitation={T.$aEcrire.rienACloturer} />
        ) : (
          liste.map((r) => (
            <FormCloture
              key={r.id}
              id={r.id}
              cliente={nomDe(r.clients)}
              prestation={r.service_name}
              quand={quand.format(new Date(r.starts_at))}
              dureePrevueMin={Math.round(
                (new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60_000,
              )}
              note={r.note}
              aRetenir={notesDe(r.clients)}
            />
          ))
        )}
      </CorpsEcran>
    </>
  )
}

function nomDe(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Sans fiche'
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return 'Sans fiche'
  const nom = typeof c.last_name === 'string' ? c.last_name : ''
  return `${c.first_name} ${nom}`.trim()
}

/** Les annotations techniques déjà posées sur la fiche, pour ne pas les effacer. */
function notesDe(relation: unknown): string | null {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return null
  const c = brut as Record<string, unknown>
  return typeof c.technical_notes === 'string' ? c.technical_notes : null
}
