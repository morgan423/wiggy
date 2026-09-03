import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ZONE, formatEuros } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { photosDuRendezVous } from '@/lib/photos'
import { EnteteEcran, CorpsEcran, RANGEE_ACTIVABLE } from '@/components/composition'
import { annulerRdv, validerDemande, refuserDemande, terminerRdv } from '../actions'
import { FormNoteRdv } from './note-form'
import { FormProposition } from './proposer/form'

/**
 * Le rendez-vous, EN LECTURE. Planche 16b, colonne « CONSULTATION ».
 *
 * La règle de la planche est une règle de sûreté autant que de composition :
 * **consultation n'est pas édition**. Cet écran ne contient aucun champ, donc
 * aucun tap accidentel ne peut rien enregistrer. « Modifier » est le seul
 * chemin vers l'édition, et il est explicite.
 *
 * L'action principale suit le statut : à venir → commencer le trajet, en
 * cours → terminer, terminé → aucune, la pastille miel suffit. Une demande qui
 * attend une décision porte les deux réponses, ici et pas dans la liste :
 * l'agenda montre le chevron, la décision se prend devant le détail.
 */

const T = copy.agendaTournee
const D = copy.demandesPro
const F = copy.ficheCliente

const jourLong = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const heure = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

export default async function RendezVous({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePro()
  const supabase = await supabaseServer()

  // La RLS fait le filtrage : un identifiant appartenant à un autre pro ne
  // renvoie simplement rien.
  const { data: rdv } = await supabase
    .from('appointments')
    .select(
      'id, service_name, price_cents, starts_at, ends_at, address_line1, postal_code, city, lat, lng, access_notes, note, status, travel_min_from_previous, client_id, clients(id, first_name, last_name, technical_notes)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!rdv) notFound()

  // La lecture ci-dessus est passée par la RLS : si elle a renvoyé une ligne,
  // ce rendez-vous appartient bien au pro connecté. C'est cette preuve qui
  // autorise la signature des photos.
  const photos = await photosDuRendezVous(rdv.id)

  const cliente = clienteDe(rdv.clients)

  // B2 : la dernière entrée du journal technique, celle qui sert aujourd'hui.
  const { data: derniereEntree } = cliente
    ? await supabase
        .from('client_notes')
        .select('contenu')
        .eq('client_id', cliente.id)
        .order('fait_le', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }
  const maintenant = new Date()
  const aDecider = rdv.status === 'pending' || rdv.status === 'conditional'
  const annule = rdv.status === 'cancelled'
  const termine = rdv.status === 'done' || new Date(rdv.ends_at) <= maintenant
  const enCours = !termine && new Date(rdv.starts_at) <= maintenant
  const lieu = [rdv.address_line1, rdv.city].filter(Boolean).join(', ')

  return (
    <>
      <EnteteEcran
        retour="/app/agenda"
        retourLibelle={T.rendezVous.retour}
        variante="jour"
        statement={nomDe(cliente)}
        sousTitre={remplir(T.gabarits.recapRdv, {
          prestation: rdv.service_name,
          jour: jourLong.format(new Date(rdv.starts_at)),
          heure: heure.format(new Date(rdv.starts_at)),
          prix: formatEuros(rdv.price_cents),
        })}
      >
        {/* La pastille de statut est DANS le bandeau, alignée à gauche sous le
            récapitulatif : sur la planche, elle appartient à l'identité du
            rendez-vous, pas à sa liste d'actions. */}
        <span className="mt-1.5 flex">
          <StatutRdv annule={annule} aDecider={aDecider} enCours={enCours} termine={termine} />
        </span>
      </EnteteEcran>

      <CorpsEcran serre>
        <BlocLecture titre={lieu || D.$aEcrire.adresseAComplete} precision={rdv.access_notes}>
          {rdv.travel_min_from_previous !== null ? (
            <span className="text-texte-attenue">
              {remplir(T.gabarits.depuisPrecedent, { min: String(rdv.travel_min_from_previous) })}
            </span>
          ) : null}
        </BlocLecture>

        {/*
          B2 — les notes de la FICHE, pré-affichées à chaque rendez-vous. C'est
          la promesse anti-carnet-papier : la pro n'a pas à aller les chercher,
          elles sont là où elle en a besoin.
        */}
        {cliente?.technical_notes ? (
          <Link
            href={`/app/clientes/${cliente.id}`}
            className={`block rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5] ${RANGEE_ACTIVABLE}`}
          >
            <span className="font-extrabold">{F.$aEcrire.profilTechnique}</span> ·{' '}
            {cliente.technical_notes}
          </Link>
        ) : null}

        {/* B2 niveau 2 : ce qui a été FAIT la dernière fois. C'est ce qui sert
            la prestation d'aujourd'hui, plus que le profil permanent. */}
        {derniereEntree ? (
          <Link
            href={`/app/clientes/${cliente?.id ?? ''}`}
            className={`block rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5] ${RANGEE_ACTIVABLE}`}
          >
            <span className="font-extrabold">{F.$aEcrire.journalDerniere}</span> ·{' '}
            {derniereEntree.contenu}
          </Link>
        ) : null}

        {/* B3 — la note de CE rendez-vous, distincte de la fiche. */}
        <FormNoteRdv id={rdv.id} note={rdv.note} />

        {photos.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-[14px] bg-surface px-3 py-2.5">
            <span className="text-[12.5px] font-extrabold">{T.$aEcrire.photosCliente}</span>
            <ul className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <li key={photo.url}>
                  {/* Pas de `next/image` : ces URL sont signées et expirent, les
                      optimiser reviendrait à les mettre en cache après leur mort. */}
                  <img
                    src={photo.url}
                    alt={photo.kind === 'current' ? 'Cheveux au naturel' : 'Inspiration'}
                    className="size-24 rounded-champ object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/*
          Une demande qui attend porte ses deux réponses. Elles sont ici, devant
          le détail qui permet de décider, et non dans la liste : décider sans
          avoir lu où c'est et quand, c'est décider à l'aveugle.
        */}
        {/*
          A11 — en mode validation, la pro peut CONTRE-PROPOSER avant
          d'accepter. Le rendez-vous ne bouge qu'après l'accord de sa cliente.
        */}
        {aDecider ? (
          <FormProposition
            id={rdv.id}
            prenom={cliente?.first_name ?? ''}
            serviceNom={rdv.service_name}
            prix={(rdv.price_cents / 100).toFixed(2).replace('.', ',')}
            dureeMin={Math.round(
              (new Date(rdv.ends_at).getTime() - new Date(rdv.starts_at).getTime()) / 60_000,
            )}
          />
        ) : null}

        {aDecider ? (
          <div className="flex gap-2">
            <form action={validerDemande} className="flex-1">
              <input type="hidden" name="id" value={rdv.id} />
              <button
                type="submit"
                className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
              >
                {D.actions.valider}
              </button>
            </form>
            <form action={refuserDemande} className="flex-1">
              <input type="hidden" name="id" value={rdv.id} />
              <button
                type="submit"
                className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[13px] font-bold hover:border-erreur hover:text-erreur"
              >
                {D.actions.refuser}
              </button>
            </form>
          </div>
        ) : null}

        {/*
          L'action principale suit le statut (planche 16b) : à venir, c'est le
          trajet ; en cours, c'est « Terminé ». B6 : la clôture enregistre le
          temps RÉELLEMENT passé, et c'est cette mesure qui affine les créneaux
          proposés ensuite. Un tap, une mesure, rien à saisir.
        */}
        {!annule && !termine && enCours ? (
          <form action={terminerRdv}>
            <input type="hidden" name="id" value={rdv.id} />
            <button
              type="submit"
              className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
            >
              {T.$aEcrire.terminer}
            </button>
          </form>
        ) : null}

        {!annule && !termine && !enCours && rdv.lat !== null && rdv.lng !== null ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${String(rdv.lat)},${String(rdv.lng)}`}
            rel="noopener noreferrer"
            target="_blank"
            className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
          >
            {T.rendezVous.trajetVers}
          </a>
        ) : null}

        {!annule ? (
          <div className="mt-auto flex flex-col gap-2 pt-4 pb-3.5">
            <Link
              href={`/app/agenda/${rdv.id}/modifier`}
              className="tactile w-full rounded-pilule border-[1.5px] border-texte-principal/25 py-3 text-center text-[13px] font-bold hover:border-prune"
            >
              {T.rendezVous.modifier}
            </Link>
            <form action={annulerRdv}>
              <input type="hidden" name="id" value={rdv.id} />
              <button
                type="submit"
                className="tactile w-full text-[12px] font-bold text-erreur hover:underline"
              >
                {T.rendezVous.annuler}
              </button>
            </form>
          </div>
        ) : null}
      </CorpsEcran>
    </>
  )
}

/**
 * Un bloc de lecture de la planche : le libellé en gras, la précision à la
 * suite, sur la même carte. Rien n'est cliquable, rien n'est un champ.
 */
function BlocLecture({
  titre,
  precision,
  children,
}: {
  titre: string
  /** Ce qui suit le libellé sur la même ligne, après le point médian. */
  precision?: string | null
  /** Ce qui vient à la ligne suivante, quand il y a quelque chose. */
  children?: React.ReactNode
}) {
  return (
    <p className="rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5]">
      <span className="font-extrabold">{titre}</span>
      {precision ? ` · ${precision}` : null}
      {children ? (
        <>
          <br />
          {children}
        </>
      ) : null}
    </p>
  )
}

function StatutRdv({
  annule,
  aDecider,
  enCours,
  termine,
}: {
  annule: boolean
  aDecider: boolean
  enCours: boolean
  termine: boolean
}) {
  const commun = 'rounded-pilule px-2.5 py-1 text-[10px] font-extrabold'
  if (annule) return <span className={`${commun} bg-erreur text-texte-sur-plein`}>Annulé</span>
  if (aDecider) return <span className={`${commun} bg-attente text-texte-sur-miel`}>{D.badge}</span>
  if (termine)
    return <span className={`${commun} bg-celebration text-texte-sur-miel`}>{T.etats.termine}</span>
  if (enCours)
    return <span className={`${commun} bg-action text-texte-sur-plein`}>{T.etats.enCours}</span>
  return (
    <span className={`${commun} bg-texte-sur-plein/14 text-texte-sur-plein`}>
      {T.$aEcrire.aVenir}
    </span>
  )
}

type Cliente = {
  id: string
  first_name: string
  last_name: string | null
  technical_notes: string | null
}

function clienteDe(relation: unknown): Cliente | undefined {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return undefined
  const c = brut as Record<string, unknown>
  if (typeof c.first_name !== 'string') return undefined
  return {
    id: typeof c.id === 'string' ? c.id : '',
    first_name: c.first_name,
    last_name: typeof c.last_name === 'string' ? c.last_name : null,
    technical_notes: typeof c.technical_notes === 'string' ? c.technical_notes : null,
  }
}

const nomDe = (cliente: Cliente | undefined) =>
  cliente ? `${cliente.first_name} ${cliente.last_name ?? ''}`.trim() : 'Sans fiche'
