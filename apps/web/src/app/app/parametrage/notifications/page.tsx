import { EVENEMENTS, pushParDefaut } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { pushConfigure, clePubliquePush } from '@/lib/push'
import { EnteteEcran, CorpsEcran, EtiquetteSection } from '@/components/composition'
import { LigneMatrice } from './ligne'
import { AbonnementAppareil } from './abonnement'

/**
 * B14 — les réglages de notification, événement par canal.
 *
 * **Trois niveaux, et un seul n'est pas réglable.** Le journal reçoit tout,
 * toujours : il est montré comme ACQUIS, pas comme une case décochable. Un
 * registre qu'on peut couper crée des trous invisibles, et la pro ne sait pas
 * ce qu'elle ne voit pas. Une pro qui coupe tout garde donc un registre exact,
 * elle choisit simplement de ne pas être dérangée.
 *
 * Les deux colonnes réglables sont le BADGE (ce qui attire l'œil dans l'app) et
 * le PUSH (ce qui interrompt dans la poche). Ce sont deux questions
 * différentes : un avis mérite d'être vu à l'ouverture sans mériter de couper
 * une prestation.
 */
export const dynamic = 'force-dynamic'

export default async function Notifications() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('pro_settings')
    .select('*')
    .eq('pro_id', pro.id)
    .maybeSingle()
  const reglages = (data ?? {}) as Record<string, boolean | null>

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle="Profil"
        variante="section"
        statement="Notifications"
        sousTitre="Le journal garde tout. À toi de dire ce qui doit se voir, et ce qui doit te déranger."
      />
      <CorpsEcran>
        {/*
          Le premier niveau, montré comme acquis. Il n'est pas une case grisée :
          une case grisée dit « tu n'as pas le droit », alors qu'ici c'est une
          garantie qu'on donne.
        */}
        <p className="rounded-carte bg-celebration/25 px-3.5 py-3 text-[12.5px] leading-[1.5]">
          <strong className="font-bold">Le journal reçoit tout, toujours.</strong> Même ce que tu
          fais taire ci-dessous reste écrit dans la cloche : tu peux ne pas être dérangée sans
          jamais rien manquer.
        </p>

        {!pushConfigure() ? (
          /*
            Dire la vérité plutôt que de laisser croire. Une bascule qui existe
            pendant que rien ne part est pire qu'une bascule absente : la pro se
            croit prévenue et ne l'est pas.
          */
          <p className="mt-3 rounded-carte bg-attente/25 px-3.5 py-3 text-[12.5px] leading-[1.5]">
            <strong className="font-bold">Le push n’est pas encore actif sur ce serveur.</strong> La
            colonne se règle déjà, mais rien ne partira tant que les clés d’envoi ne sont pas
            posées.
          </p>
        ) : null}

        {/* C9 ③ — l'abonnement de cet appareil. Il vient AVANT la matrice :
            régler quels événements poussent n'a aucun sens tant que l'appareil
            n'a rien autorisé. */}
        <AbonnementAppareil clePublique={clePubliquePush()} />

        <div className="mt-5 flex items-center justify-end gap-3 pr-1 text-[10.5px] font-extrabold tracking-widest text-texte-attenue uppercase">
          <span className="w-11 text-center">Badge</span>
          <span className="w-11 text-center">Push</span>
        </div>

        <EtiquetteSection>Ce qui change ta journée</EtiquetteSection>
        {EVENEMENTS.filter((e) => e.nature !== 'agreable_a_savoir').map((e) => (
          <LigneMatrice
            key={e.cle}
            cle={e.cle}
            libelle={e.libelle}
            explication={e.explication}
            attend={e.attend}
            badge={reglages[`badge_${e.cle}`] ?? true}
            push={reglages[`push_${e.cle}`] ?? pushParDefaut(e.nature)}
          />
        ))}

        <EtiquetteSection>Agréable à savoir</EtiquetteSection>
        {EVENEMENTS.filter((e) => e.nature === 'agreable_a_savoir').map((e) => (
          <LigneMatrice
            key={e.cle}
            cle={e.cle}
            libelle={e.libelle}
            explication={e.explication}
            attend={e.attend}
            badge={reglages[`badge_${e.cle}`] ?? true}
            push={reglages[`push_${e.cle}`] ?? pushParDefaut(e.nature)}
          />
        ))}
        <p className="mt-3 px-1 text-[11.5px] leading-[1.5] text-texte-attenue">
          Ces deux-là ne t’interrompent pas par défaut : ils font plaisir, ils n’appellent rien.
        </p>
      </CorpsEcran>
    </>
  )
}
