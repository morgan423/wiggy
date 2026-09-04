import Link from 'next/link'
import { ETAPES, prochaineEtape, peutRecevoir, heuresRestantes, OBJECTIF_HEURES } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran, RangeeEcran, ActionPrincipale } from '@/components/composition'
import { etapesFaites } from '@/lib/parcours'

/**
 * G3 — le parcours d'activation.
 *
 * **Les écrans existaient déjà, c'est le CHEMIN qui manquait.** Une pro qui
 * s'inscrivait arrivait sur un hub et devait deviner par où commencer, dans
 * quel ordre, et quand elle avait fini.
 *
 * **L'objectif est chiffré et VISIBLE** : première réservation reçue sous
 * 48 heures. Ce n'est pas un ornement, c'est ce qui transforme cinq réglages en
 * une course qui a un but. Et il disparaît une fois le délai passé : une pro
 * qui n'a pas reçu de réservation en deux jours n'a pas besoin qu'on le lui
 * reproche à chaque ouverture.
 */
export const dynamic = 'force-dynamic'

export default async function Demarrage() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const faites = await etapesFaites(pro.id)
  const suivante = prochaineEtape(faites)

  const { data: compte } = await supabase.auth.getUser()
  const inscriteLe = compte.user?.created_at ? new Date(compte.user.created_at) : new Date()
  const reste = heuresRestantes(inscriteLe)

  // Une réservation reçue ? Alors l'objectif est ATTEINT, et on le dit avant
  // toute autre chose : c'est le seul moment du produit qui mérite une
  // célébration à l'ouverture.
  const { count: reservations } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('pro_id', pro.id)
    .eq('source', 'online')

  const atteint = (reservations ?? 0) > 0

  return (
    <>
      <EnteteEcran
        variante="section"
        statement={atteint ? 'C’est parti.' : 'Ta page en cinq étapes.'}
        sousTitre={
          atteint
            ? 'Ta première réservation est arrivée. Le reste, c’est ton métier.'
            : suivante === null
              ? 'Tout est prêt. Il ne reste qu’à partager ton lien.'
              : `L’objectif : ta première réservation sous ${String(OBJECTIF_HEURES)} h.`
        }
      />
      <CorpsEcran>
        {!atteint && reste !== null ? (
          <p className="rounded-carte bg-celebration/25 px-3.5 py-3 text-[12.5px] leading-[1.5]">
            <strong className="font-bold">Il te reste {String(reste)} h</strong> pour recevoir ta
            première réservation. Les pros qui y arrivent ont toutes fait la même chose : poser leur
            lien dans leur bio.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {ETAPES.map((etape) => (
            <RangeeEcran
              key={etape.cle}
              principal={etape.titre}
              secondaire={faites[etape.cle] ? undefined : etape.pourquoi}
              href={faites[etape.cle] ? undefined : etape.href}
              chevron={!faites[etape.cle]}
              attenue={faites[etape.cle]}
            >
              {faites[etape.cle] ? <Coche /> : null}
            </RangeeEcran>
          ))}
        </div>

        {suivante ? (
          <ActionPrincipale href={suivante.href}>{suivante.titre}</ActionPrincipale>
        ) : (
          <ActionPrincipale href="/app/parametrage/profil">Voir ma page</ActionPrincipale>
        )}

        {/*
          L'import du répertoire n'est PAS une étape du parcours : il ne
          conditionne aucune réservation, et l'imposer entre la zone et les
          horaires ferait décrocher. Il est proposé une fois la page prête,
          quand la pro a le temps de s'en occuper.
        */}
        {peutRecevoir(faites) ? (
          <Link
            href="/app/clientes/importer"
            className="mt-6 block rounded-carte border-2 border-dashed border-trait-discret px-3.5 py-3 text-center text-[12.5px] font-bold"
          >
            Récupérer mes clientes depuis mon téléphone
          </Link>
        ) : null}
      </CorpsEcran>
    </>
  )
}

function Coche() {
  return (
    <span
      aria-label="Fait"
      className="flex size-6 shrink-0 items-center justify-center rounded-pilule bg-celebration"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M5 12.5 10 17.5 19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-texte-sur-miel"
        />
      </svg>
    </span>
  )
}
