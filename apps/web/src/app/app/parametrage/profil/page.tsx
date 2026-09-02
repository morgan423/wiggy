import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { Avatar } from '@/components/avatar'
import { FormProfil, BoutonPublication, LienPage } from './form'

/**
 * Ma Page, planche 14g : « Ce que voient tes clientes. »
 *
 * L'écran s'ouvre sur l'identité — avatar, nom, adresse publique — puis
 * descend vers ce qui la compose. La mise en ligne ferme l'écran, désactivée
 * tant que les trois étapes ne sont pas posées, avec la phrase qui dit ce qui
 * manque. Une fois en ligne, elle cède la place à « Voir ma page ».
 *
 * ⚠️ Écart signalé : la planche montre un second bouton « Partager » et un
 * choix d'avatar ou de photo. Le partage natif et le système d'avatars dessinés
 * ne sont pas construits ; on ne les simule pas.
 */
export default async function Profil() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  const [profilLu, prestations, communes, horaires] = await Promise.all([
    supabase
      .from('pros')
      .select(
        'display_name, headline, bio, city, instagram_url, phone, years_experience, pronoun, published, slug',
      )
      .eq('id', pro.id)
      .maybeSingle(),
    supabase.from('services').select('id'),
    supabase.from('service_area_communes').select('insee_code'),
    supabase.from('working_hours').select('id'),
  ])

  const profil = profilLu.data
  if (!profil) return null

  // Les trois étapes de la planche 14c, relues ici : c'est ce qui arme la mise
  // en ligne. Aucun chiffre inventé, aucune supposition.
  const pret =
    (prestations.data ?? []).length > 0 &&
    (communes.data ?? []).length > 0 &&
    (horaires.data ?? []).length > 0

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.wiggy.fr'
  const adresse = `${base.replace(/^https?:\/\//, '')}/${profil.slug}`

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Ce que voient tes clientes." />
      <CorpsEcran>
        <div className="flex items-center gap-3">
          <Avatar nom={profil.display_name} taille="md" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="titre font-bold tracking-tight">{profil.display_name}</span>
            <LienPage adresse={adresse} />
          </span>
        </div>

        <FormProfil profil={profil} />

        <BoutonPublication publiee={profil.published} pret={pret} slug={profil.slug} />
      </CorpsEcran>
    </>
  )
}
