import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { modeDuPro } from '@/lib/mode'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { Avatar } from '@/components/avatar'
import { FormProfil, BoutonPublication, LienPage, FormDepart } from './form'

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
        'display_name, headline, bio, city, instagram_url, phone, years_experience, pronoun, published, slug, start_line1, start_postal_code, start_city',
      )
      .eq('id', pro.id)
      .maybeSingle(),
    supabase.from('services').select('id'),
    supabase.from('service_area_communes').select('insee_code'),
    supabase.from('working_hours').select('id'),
  ])

  const profil = profilLu.data
  if (!profil) return null

  // Lu à part, et sans jamais tomber : voir `lib/mode.ts`.
  const mode = await modeDuPro(supabase, pro.id)

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

        <FormProfil profil={{ ...profil, mode }} />

        {/* D16 : le point de départ. Il vit ici, avec l'identité, parce que
            c'est une donnée de la pro et non un réglage de fonctionnement. Il
            n'est jamais affiché à une cliente. */}
        <FormDepart
          depart={{
            ligne: profil.start_line1,
            codePostal: profil.start_postal_code,
            ville: profil.start_city,
          }}
        />

        <BoutonPublication publiee={profil.published} pret={pret} slug={profil.slug} />
      </CorpsEcran>
    </>
  )
}
