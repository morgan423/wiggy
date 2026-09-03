import Link from 'next/link'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, RangeeEcran, PastilleEtat } from '@/components/composition'

/**
 * D17 ④ — « Mon compte » : ce qui concerne le compte Wiggy, pas l'activité.
 *
 * L'adresse e-mail, le mot de passe, le téléphone. Trois choses qu'on règle
 * une fois par an, et qui n'avaient nulle part où vivre : elles étaient
 * dispersées entre l'écran de profil et les parcours de vérification.
 */
export default async function Compte() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const [{ data: auth }, { data: fiche }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('pros').select('phone, phone_verified_at').eq('id', pro.id).maybeSingle(),
  ])
  const T = copy.agendaTournee

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={T.$aEcrire.navProfil}
        statement={T.$aEcrire.monCompte}
      />
      <CorpsEcran serre>
        <RangeeEcran principal="Ton e-mail" resume={auth.user?.email ?? undefined}>
          {auth.user?.email_confirmed_at ? <PastilleEtat>Vérifié</PastilleEtat> : null}
        </RangeeEcran>
        {auth.user?.email_confirmed_at ? null : (
          <RangeeEcran principal="Vérifier mon e-mail" chevron invite href="/verification/email" />
        )}

        <RangeeEcran principal="Ton téléphone" resume={fiche?.phone ?? undefined}>
          {fiche?.phone_verified_at ? <PastilleEtat>Vérifié</PastilleEtat> : null}
        </RangeeEcran>
        {fiche?.phone_verified_at ? null : (
          <RangeeEcran
            principal="Vérifier mon téléphone"
            chevron
            invite
            href="/verification/telephone"
          />
        )}

        {/* Le changement de mot de passe passe par le même parcours que l'oubli :
            un code sur le téléphone vérifié, jamais un lien par e-mail. Un seul
            chemin, donc un seul endroit où il peut être faux. */}
        <RangeeEcran principal="Changer mon mot de passe" chevron href="/mot-de-passe-oublie" />

        <p className="text-[11.5px] leading-[1.5] text-texte-attenue">
          Tes données t’appartiennent. L’export et la suppression de ton compte arrivent avec G5.
        </p>

        <Link
          href="/app/parametrage"
          className="mt-auto pt-8 pb-3.5 text-[12px] font-bold text-texte-attenue hover:text-prune"
        >
          ‹ {T.$aEcrire.navProfil}
        </Link>
      </CorpsEcran>
    </>
  )
}
