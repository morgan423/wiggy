import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
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
      <h1 className="text-3xl font-extrabold tracking-tight">Ta page de réservation</h1>
      <p className="mt-3 text-texte-secondaire">
        C’est le lien que tu partages : bio Instagram, messages, fiche Google. Une seule adresse, la
        tienne.
      </p>

      <div className="mt-8 rounded-carte border-2 border-trait-discret p-6">
        <p className="text-sm font-semibold tracking-widest text-texte-secondaire uppercase">
          Ton lien
        </p>
        <p className="mt-2 text-lg font-bold break-all">{adresse}</p>
        <p className="mt-4 text-texte-secondaire">
          {profil.published
            ? 'Ta page est en ligne : tout le monde peut la voir.'
            : 'Ta page n’est pas encore en ligne. Personne ne peut la voir.'}
        </p>
        <div className="mt-6">
          <BoutonPublication publiee={profil.published} />
        </div>
      </div>

      <section className="mt-12 border-t border-trait-discret pt-8">
        <h2 className="text-xl font-bold tracking-tight">Ce que voit ta clientèle</h2>
        <FormProfil profil={profil} />
      </section>
    </>
  )
}
