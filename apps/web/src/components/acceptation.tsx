import Link from 'next/link'
import { CaseACocher } from './trousse/case-a-cocher'
import { aFaireAccepter } from '@/lib/legal'
import type { PointAcceptation } from '@wiggy/core'

/**
 * G7 — le bloc d'acceptation d'un point contractuel.
 *
 * **La case n'est JAMAIS pré-cochée** : `CaseACocher` ouvre décochée par
 * défaut, et rien ici ne le contredit. Une case pré-cochée n'est pas un
 * consentement, c'est un défaut d'attention transformé en accord.
 *
 * **Le nom du champ porte la version.** `accepte:cgv:0.1-beta` : l'action
 * serveur relit la version en vigueur au moment où elle écrit, et refuse si
 * elle a changé entre l'affichage et l'envoi. Un formulaire resté ouvert
 * pendant une mise à jour des CGV ne peut donc pas faire signer l'ancien texte.
 *
 * Les documents s'ouvrent dans un ONGLET À PART : aller lire les CGV ne doit
 * jamais coûter le formulaire à moitié rempli.
 */
export async function BlocAcceptation({
  point,
  userId,
  intro,
}: {
  point: PointAcceptation
  userId?: string
  /** La phrase qui précède, quand le point en demande une. */
  intro?: string
}) {
  const aAccepter = await aFaireAccepter(point, userId)
  if (aAccepter.length === 0) return null

  return (
    <div className="mt-6 border-t border-trait-discret pt-5">
      {intro ? <p className="text-[12.5px] text-texte-attenue">{intro}</p> : null}
      {aAccepter.map(({ slug, document }) =>
        document === null ? (
          // Un document absent de la base bloque le point plutôt que de le
          // laisser passer : mieux vaut un écran qui ne se valide pas qu'un
          // compte créé sans CGV.
          <p key={slug} className="mt-3 text-[12.5px] font-bold text-erreur">
            Le document « {slug} » est indisponible. Réessaie dans un instant.
          </p>
        ) : (
          <CaseACocher
            key={slug}
            id={`accepte-${slug}`}
            name={`accepte:${slug}:${document.version}`}
            label={LIBELLES[slug] ?? `J’accepte : ${document.titre}`}
            aide={undefined}
          />
        ),
      )}
      <p className="mt-3 flex flex-wrap gap-3 text-[11.5px]">
        {aAccepter
          .filter((a) => a.document !== null)
          .map(({ slug, document }) => (
            <Link
              key={slug}
              href={`/legal/${slug}`}
              target="_blank"
              rel="noopener"
              className="font-bold text-action underline"
            >
              Lire {document?.titre.toLowerCase()} ↗
            </Link>
          ))}
      </p>
    </div>
  )
}

/**
 * Le libellé de la case, par document.
 *
 * Il est ici et non en base : c'est du COPY d'interface, pas du texte
 * contractuel. Un avocat livre un contrat, il ne livre pas le libellé d'une
 * case à cocher, et mélanger les deux ferait dépendre nos écrans de sa
 * rédaction.
 */
const LIBELLES: Record<string, string> = {
  cgv: 'J’accepte les conditions générales de vente',
  confidentialite: 'J’ai lu la politique de confidentialité',
  cgu: 'J’accepte les conditions générales d’utilisation',
  sms: 'J’accepte de recevoir la confirmation et le rappel par SMS',
  parrainage: 'J’accepte les conditions du parrainage',
}
