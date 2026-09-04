import { notFound } from 'next/navigation'
import Link from 'next/link'
import { documentCourant } from '@/lib/legal'

/**
 * G7 — un document contractuel, dans sa version en vigueur.
 *
 * **Aucun texte n'est écrit ici.** La page rend ce que la base contient, et
 * c'est toute la raison d'être de cette forme : au jalon J2, l'avocat livre ses
 * textes, on insère des lignes, et ce fichier ne change pas.
 *
 * La version et sa date sont AFFICHÉES. Ce n'est pas une coquetterie : la pro
 * doit pouvoir vérifier que ce qu'elle lit est bien ce qu'elle a accepté, et
 * une version qu'on ne montre pas ne prouve rien à celle qui la cherche.
 */
export const dynamic = 'force-dynamic'

export default async function PageLegale({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await documentCourant(slug)
  if (!doc) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-[13px] font-bold text-action">
        ‹ Wiggy
      </Link>
      <h1 className="titre mt-6">{doc.titre}</h1>
      <p className="mt-2 text-[12.5px] text-texte-attenue">
        Version {doc.version} · en vigueur depuis le {enFrancais(doc.effectiveOn)}
      </p>
      <div className="mt-8 flex flex-col gap-4 text-[15px] leading-[1.65] text-texte-secondaire">
        {doc.corps.split('\n\n').map((paragraphe, i) => (
          <p key={i}>{gras(paragraphe)}</p>
        ))}
      </div>
    </main>
  )
}

function enFrancais(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${iso}T12:00:00`))
}

/**
 * Le gras `**…**` du Markdown, et rien d'autre.
 *
 * Un rendu Markdown complet accepterait des liens et du HTML, donc du contenu
 * actif dans un texte qui vient de la base. Ici la mise en forme se limite à ce
 * dont un texte juridique a besoin, et le reste s'affiche tel quel.
 */
function gras(texte: string): React.ReactNode[] {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((bout, i) =>
    bout.startsWith('**') && bout.endsWith('**') ? (
      <strong key={i} className="font-bold text-texte-principal">
        {bout.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{bout}</span>
    ),
  )
}
