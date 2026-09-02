import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran } from '@/components/composition'
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
      <EnteteEcran
        retour="/app/parametrage"
        statement="Ce que voient tes clientes."
        sousTitre={
          profil.published
            ? `Ta page est en ligne : wiggy.fr/${profil.slug}`
            : 'Elle s’active quand prestations, zone et journées sont posées.'
        }
      />
      {/*
        Planche 14g : « Mettre ma page en ligne » s'active quand prestations,
        zone et journées sont posées, et D9 y ajoute les deux vérifications.
        L'adresse publique reste visible, elle est ce qu'on partage.
      */}
      <div className="mt-4 rounded-carte bg-surface p-5">
        <p className="text-sm font-semibold tracking-widest text-texte-secondaire uppercase">
          Ton lien
        </p>
        <p className="mt-1 text-lg font-bold break-all">{adresse}</p>
        <div className="mt-4">
          <BoutonPublication publiee={profil.published} />
        </div>
      </div>

      <FormProfil profil={profil} />
    </>
  )
}
