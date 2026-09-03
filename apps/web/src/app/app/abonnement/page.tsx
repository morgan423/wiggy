import { requiredTierFor, TIERS, type Capability, type Tier } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { FormSms } from './form'
import { EnteteEcran, CorpsEcran, ActionPrincipale, RANGEE } from '@/components/composition'

/**
 * L'écran où atterrit une pro qui ouvre une fonctionnalité que son offre ne
 * contient pas. `requireCapability()` y redirige depuis toujours ; la page,
 * elle, n'existait pas, et une pro en offre 1 tombait sur un 404.
 *
 * Ce n'est PAS G1 : ni choix d'offre, ni paiement, ni essai, ni résiliation.
 * Ces textes sont contractuels, fournis par Morgan, alignés mot pour mot sur
 * les CGV, et ils ne s'improvisent pas. Cette page dit une seule chose, celle
 * qui manque vraiment aujourd'hui : **quelle offre contient ce que tu viens de
 * demander**, et par où revenir.
 *
 * Elle ne vend rien. Un mur qui dit « abonne-toi » sans dire à quoi est une
 * impasse polie ; celui-ci nomme la fonctionnalité, nomme l'offre, et rouvre la
 * porte d'où l'on vient.
 */

const NOMS: Record<Tier, string> = {
  tier_1: 'Essentielle',
  tier_2: 'Tournée',
  tier_3: 'Intelligence',
}

/** Ce que chaque capacité veut dire pour une pro, dans ses mots à elle. */
const LIBELLES: Partial<Record<Capability, string>> = {
  tour_copilot: 'Le copilote de tournée',
  booking_geo_filtered: 'Les créneaux calculés par quartier',
  booking_travelling: 'Les demandes hors zone',
  distance_fees: 'Le forfait déplacement',
  completion_learning: 'L’apprentissage de tes durées',
  sms_reminders: 'Les rappels par SMS',
  smart_followup: 'Les relances automatiques',
  stats_basic: 'Tes statistiques',
  stats_time_optimisation: 'L’optimisation de tes journées',
}

export default async function Abonnement({
  searchParams,
}: {
  searchParams: Promise<{ requiert?: string }>
}) {
  const { pro, abonnement } = await requirePro()
  const supabase = await supabaseServer()
  const { data: reglages } = await supabase
    .from('pro_settings')
    .select('sms_enabled')
    .eq('pro_id', pro.id)
    .maybeSingle()
  const { requiert } = await searchParams

  const capacite = requiert as Capability | undefined
  const palierRequis = capacite && capacite in LIBELLES ? requiredTierFor(capacite) : undefined
  const libelle = capacite ? LIBELLES[capacite] : undefined

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        variante="jour"
        statement={libelle ?? 'Ton offre'}
        sousTitre={
          palierRequis
            ? `Disponible à partir de l’offre ${NOMS[palierRequis]}.`
            : 'Cette fonctionnalité n’est pas comprise dans ton offre.'
        }
      />
      <CorpsEcran serre>
        <div className={`${RANGEE} items-start`}>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="text-[13px] font-bold">Ton offre aujourd’hui</span>
            <span className="text-[11.5px] text-texte-attenue">{NOMS[abonnement.tier]}</span>
          </span>
        </div>

        {/*
          Aucun bouton d'achat : le changement d'offre est G1, avec ses textes
          contractuels. Promettre ici un parcours qui n'existe pas ferait perdre
          un tap et un peu de confiance.
        */}
        {/* 17c : les SMS vivent avec l'offre, parce que c'est l'offre qui les
            contient. B7 : décoché, les clientes sont prévenues par e-mail et
            notification, gratuitement. Elles sont prévenues dans les deux cas. */}
        <FormSms actif={reglages?.sms_enabled ?? false} />

        <p className="text-[12px] leading-[1.5] text-texte-attenue">
          Le changement d’offre depuis l’app arrive bientôt. En attendant, écris-nous : on te
          bascule le jour même.
        </p>

        <div className="mt-auto pt-4 pb-3.5">
          <ActionPrincipale href="/app/parametrage">Revenir à mon activité</ActionPrincipale>
        </div>
      </CorpsEcran>
    </>
  )
}

/** Sert au typage strict de `NOMS` : si un palier s'ajoute, ce fichier casse. */
const _tousLesPaliersSontNommes: readonly Tier[] = TIERS
void _tousLesPaliersSontNommes
