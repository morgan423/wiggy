import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, RANGEE } from '@/components/composition'
import { formatEuros } from '@wiggy/core'
import { RechercheCommune } from './recherche'
import { FormForfait } from './forfait'
import { retirerCommune } from './actions'

/**
 * La zone d'intervention, planche 14e.
 *
 * La zone est une LISTE DE COMMUNES, jamais un rayon. Chaque commune est une
 * puce prune pleine qui prend toute la largeur nécessaire et passe seule à la
 * ligne : un nom de commune n'est jamais tronqué ni coupé.
 *
 * Au jour un, le champ de recherche est là, avec la phrase qui dit par où
 * commencer. Ensuite, l'ajout redevient une puce en pointillés : deux
 * affordances d'ajout simultanées sur le même écran ont déjà été relevées comme
 * un défaut à la recette 6.
 */
export default async function Zone() {
  await requirePro()
  const supabase = await supabaseServer()

  const { data: choisies } = await supabase
    .from('service_area_communes')
    .select('insee_code, name, postal_code')
    .order('name')

  const dejaChoisies = (choisies ?? []).map((c) => c.insee_code)
  const liste = choisies ?? []

  // A8 : le forfait de base vit sur la ligne `from_km = 0`.
  const { data: forfait } = await supabase
    .from('distance_fees')
    .select('fee_cents')
    .eq('from_km', 0)
    .maybeSingle()

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Où tu te déplaces." />
      <CorpsEcran>
        {/*
          Planche 14e : les puces et l'ajout vivent dans le MÊME flux. La puce
          en pointillés « + Commune » suit les communes posées, elle ne se
          range pas sur une ligne à elle.
        */}
        <div className="flex flex-wrap items-center gap-1.5">
          {liste.map((c) => (
            <span
              key={c.insee_code}
              className="flex items-center gap-2 rounded-pilule bg-prune py-2.5 pr-2.5 pl-[13px] text-[12.5px] leading-[1.3] font-bold text-texte-sur-plein"
            >
              {c.name}
              <form action={retirerCommune} className="flex">
                <input type="hidden" name="insee_code" value={c.insee_code} />
                <button
                  type="submit"
                  aria-label={`Retirer ${c.name} de ta zone`}
                  className="text-texte-sur-plein-doux hover:text-texte-sur-plein"
                >
                  ✕
                </button>
              </form>
            </span>
          ))}
          <RechercheCommune dejaChoisies={dejaChoisies} replie={liste.length > 0} />
        </div>

        {liste.length === 0 ? (
          <p className="text-center text-[12.5px] leading-[1.5] text-texte-attenue">
            Commence par celle où tu vis : tu ajouteras les autres quand tu veux. 2-3 communes, ta
            tournée reste logique.
          </p>
        ) : null}

        {/*
          A6. La planche 14e met ici un interrupteur. Il n'y en a pas : le hors
          zone sous réserve est le comportement du produit, il ne se coupe pas.
          On garde donc la rangée et son explication, sans lui prêter une
          commande qui n'existe pas. Écart signalé au journal.
        */}
        <div className={`${RANGEE} items-start`}>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="text-[13px] font-bold">Au-delà de ta zone</span>
            <span className="text-[11.5px] text-texte-attenue">
              demande sous réserve, tu valides
            </span>
          </span>
        </div>

        <FormForfait montant={forfait ? formatEuros(forfait.fee_cents).replace(/\s*€/, '') : ''} />

        <p className="text-[11.5px] leading-[1.5] text-texte-attenue">
          Jamais affiché à tes clientes : elles découvrent le montant dans ta proposition, et le
          confirment.
        </p>
      </CorpsEcran>
    </>
  )
}
