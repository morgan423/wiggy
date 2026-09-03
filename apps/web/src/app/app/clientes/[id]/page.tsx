import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ZONE,
  formatEuros,
  rythmeDeRetourSemaines,
  visitesEffectives,
  depuisQuand,
} from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import {
  EnteteEcran,
  CorpsEcran,
  EtiquetteSection,
  ActionPrincipale,
  RANGEE_ACTIVABLE,
} from '@/components/composition'
import { Avatar } from '@/components/avatar'
import { FormNotes } from './notes-form'

/**
 * B1 et B2 — la fiche cliente. Planche 16c.
 *
 * L'ordre de la planche est un ordre de travail, pas une esthétique : les
 * NOTES d'abord, parce que c'est ce que la pro vient chercher avant un
 * rendez-vous ; l'adresse et le téléphone ensuite, parce que c'est ce dont
 * elle a besoin en route ; l'historique en dernier, parce qu'il se consulte et
 * ne se cherche pas.
 *
 * Le prénom est le héros (S6) : il ouvre l'écran, en gros, et le résumé de la
 * relation vient sous lui.
 *
 * La fiche se crée toute seule à la première réservation. Le pro n'a jamais de
 * fiche à saisir : c'est la promesse anti-carnet-papier.
 */

const F = copy.ficheCliente

const moisAnnee = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  month: 'long',
  year: 'numeric',
})
const jourCourt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  day: 'numeric',
  month: 'long',
})

/** Au-delà, la planche 16c demande une pagination par année : elle viendra avec le besoin. */
const HISTORIQUE_VISIBLE = 5

export default async function FicheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePro()
  const supabase = await supabaseServer()

  // La RLS fait le filtrage : une fiche appartenant à un autre pro ne renvoie
  // simplement rien.
  const [{ data: cliente }, { data: rdvs }, { data: adresses }, { data: journal }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, technical_notes')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('appointments')
        .select(
          'id, starts_at, service_name, price_cents, status, address_line1, city, access_notes',
        )
        .eq('client_id', id)
        .order('starts_at', { ascending: false }),
      supabase
        .from('client_addresses')
        .select('line1, postal_code, city, access_notes, is_primary')
        .eq('client_id', id)
        .order('is_primary', { ascending: false }),
      // B2 niveau 2 — le JOURNAL technique, daté et jamais écrasé. C'est le
      // carnet, page après page : on peut y retrouver la formule d'il y a trois
      // ans, avec sa date.
      supabase
        .from('client_notes')
        .select('id, contenu, fait_le')
        .eq('client_id', id)
        .order('fait_le', { ascending: false })
        .limit(50),
    ])

  if (!cliente) notFound()

  const historique = rdvs ?? []
  const visites = historique.map((r) => ({
    debut: new Date(r.starts_at),
    annulee: r.status === 'cancelled',
  }))
  const maintenant = Date.now()
  const passes = historique.filter(
    (r) => r.status !== 'cancelled' && new Date(r.starts_at).getTime() < maintenant,
  )
  const aVenir = historique
    .filter((r) => r.status !== 'cancelled' && new Date(r.starts_at).getTime() >= maintenant)
    .reverse()

  const nb = visitesEffectives(visites)
  const depuis = depuisQuand(visites)
  const rythme = rythmeDeRetourSemaines(visites)

  // L'adresse de la fiche si elle existe, sinon la dernière connue par
  // l'historique : la réservation en ligne pose l'adresse sur le rendez-vous,
  // pas sur la fiche, et c'est donc là qu'elle vit en pratique.
  const adresse =
    adresses?.[0] ??
    (() => {
      const avecAdresse = historique.find((r) => r.address_line1)
      return avecAdresse
        ? {
            line1: avecAdresse.address_line1 ?? '',
            postal_code: null,
            city: avecAdresse.city,
            access_notes: avecAdresse.access_notes,
            is_primary: false,
          }
        : null
    })()

  const nom = `${cliente.first_name} ${cliente.last_name ?? ''}`.trim()

  return (
    <>
      <EnteteEcran
        retour="/app/clientes"
        retourLibelle={F.liste.titre}
        variante="jour"
        vignette={<Avatar nom={nom} taille="sm" />}
        statement={cliente.first_name}
        sousTitre={
          depuis
            ? rythme
              ? remplir(F.gabarits.resume, {
                  n: String(nb),
                  depuis: moisAnnee.format(depuis),
                  semaines: String(rythme),
                })
              : remplir(F.$aEcrire.resumeSimple, {
                  n: String(nb),
                  depuis: moisAnnee.format(depuis),
                })
            : aVenir.length > 0
              ? remplir(F.gabarits.premiereVisite, {
                  quand: jourCourt.format(new Date(aVenir[0].starts_at)),
                })
              : F.$aEcrire.jamaisVenue
        }
      />

      <CorpsEcran serre>
        {/*
          B2 — les trois niveaux, dans l'ordre où ils servent.

          ① Le PROFIL technique, vrai en permanence, en tête : c'est ce qu'on
             relit avant de commencer.
          ② La DERNIÈRE entrée du journal, mise en avant, parce que c'est elle
             qui sert la prochaine prestation.
          ③ L'HISTORIQUE DATÉ, déroulable, où l'on retrouve une formule d'il y a
             trois ans avec sa date.
        */}
        <FormNotes id={cliente.id} notes={cliente.technical_notes} />

        <JournalTechnique entrees={journal ?? []} />

        {(adresse ?? cliente.phone) ? (
          <p className="rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5]">
            {adresse ? (
              <span className="font-extrabold">
                {[adresse.line1, adresse.city].filter(Boolean).join(', ')}
              </span>
            ) : null}
            {adresse?.access_notes ? ` · ${adresse.access_notes}` : ''}
            {cliente.phone ? (
              <>
                {adresse ? ' · ' : ''}
                <a href={`tel:${cliente.phone}`} className="font-bold hover:text-action">
                  {cliente.phone}
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {aVenir.map((r) => (
          <Link
            key={r.id}
            href={`/app/agenda/${r.id}`}
            className={`flex items-center justify-between gap-2.5 rounded-[14px] bg-surface px-3.5 py-3 ${RANGEE_ACTIVABLE}`}
          >
            <span className="text-[12.5px] font-bold">
              {jourCourt.format(new Date(r.starts_at))} · {r.service_name}
            </span>
            <span
              aria-hidden
              className="shrink-0 rounded-pilule bg-action px-2 py-1 text-[10px] font-extrabold whitespace-nowrap text-texte-sur-plein"
            >
              À venir
            </span>
          </Link>
        ))}

        <EtiquetteSection>{F.fiche.historique}</EtiquetteSection>
        {passes.length === 0 ? (
          <p className="text-[11.5px] leading-[1.5] text-texte-attenue">
            {F.fiche.premiereVisiteAVenir}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {passes.slice(0, HISTORIQUE_VISIBLE).map((r) => (
              <li key={r.id} className="flex justify-between gap-2.5">
                <Link href={`/app/agenda/${r.id}`} className="font-semibold hover:text-action">
                  {jourCourt.format(new Date(r.starts_at))} · {r.service_name}
                </Link>
                <span className="shrink-0 font-extrabold">{formatEuros(r.price_cents)}</span>
              </li>
            ))}
            {passes.length > HISTORIQUE_VISIBLE ? (
              <li className="text-[12px] font-bold text-texte-secondaire">
                {/*
                  La planche met « Voir les 8 › ». La pagination par année qu'elle
                  demande au-delà de vingt viendra avec le besoin : ici, on dit le
                  chiffre plutôt que de promettre un écran qui n'existe pas.
                */}
                {remplir(F.gabarits.voirTout, { n: String(passes.length) })}
              </li>
            ) : null}
          </ul>
        )}

        <div className="mt-auto pt-4 pb-3.5">
          <ActionPrincipale href={`/app/agenda/nouveau?cliente=${cliente.id}`}>
            {F.fiche.nouveauRdv}
          </ActionPrincipale>
        </div>
      </CorpsEcran>
    </>
  )
}

/**
 * B2 niveau 2 et 3 — le journal technique.
 *
 * La dernière entrée est mise en avant : c'est elle qui sert la prochaine
 * prestation. Le reste se déroule, parce qu'on y va rarement mais qu'on doit
 * pouvoir y aller. **Rien n'est jamais écrasé** : c'est tout le correctif du
 * 03/09, et c'est ce qui rend Wiggy au moins aussi bon qu'un carnet papier.
 */
function JournalTechnique({
  entrees,
}: {
  entrees: { id: string; contenu: string; fait_le: string }[]
}) {
  if (entrees.length === 0) {
    return (
      <p className="text-[11.5px] leading-[1.5] text-texte-attenue">{F.$aEcrire.journalVide}</p>
    )
  }
  const [derniere, ...precedentes] = entrees

  return (
    <>
      <div className="rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5]">
        <span className="font-extrabold">{F.$aEcrire.journalDerniere}</span>
        {' · '}
        {jourCourt.format(new Date(derniere.fait_le))}
        <br />
        {derniere.contenu}
      </div>

      {precedentes.length > 0 ? (
        <details className="rounded-[14px] bg-surface px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-extrabold text-texte-secondaire">
            {F.$aEcrire.journalTout}
          </summary>
          <ul className="mt-2 flex flex-col gap-2 text-[12.5px] leading-[1.5]">
            {precedentes.map((e) => (
              <li key={e.id}>
                <span className="font-bold">{jourCourt.format(new Date(e.fait_le))}</span> ·{' '}
                {e.contenu}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  )
}
