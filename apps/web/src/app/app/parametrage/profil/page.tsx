import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauPlein, CarteCreme } from '@/components/composition'
import { FormProfil, BoutonPublication } from './form'

export default async function Profil() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: profil } = await supabase
    .from('pros')
    .select(
      'display_name, headline, bio, city, instagram_url, phone, years_experience, pronoun, published, slug',
    )
    .eq('id', pro.id)
    .maybeSingle()

  if (!profil) return null

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.wiggy.fr'
  const adresse = `${base.replace(/^https?:\/\//, '')}/${profil.slug}`

  return (
    <>
      <PanneauPlein
        statement="Ta page de réservation."
        legende={
          profil.published
            ? 'Elle est en ligne. C’est le lien que tu partages : bio Instagram, messages, fiche Google.'
            : 'Elle n’est pas encore en ligne. Personne ne peut la voir.'
        }
        entete={<p className="text-lg font-bold break-all">{adresse}</p>}
      >
        <CarteCreme titre="Ce que voit ta clientèle">
          <div className="mt-4 rounded-carte bg-surface p-5">
            <BoutonPublication publiee={profil.published} />
          </div>
          <FormProfil profil={profil} />
        </CarteCreme>
      </PanneauPlein>
    </>
  )
}
