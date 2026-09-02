import { formatEuros, ZONE } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import {
  PanneauPlein,
  CarteCreme,
  EtiquetteSection,
  LigneEtat,
  Pastille,
  BoutonPointille,
  EtatVide,
} from '@/components/composition'
import { JOURS } from './horaires/jours'

/**
 * Le hub « Ton activité », planche 10c du board.
 *
 * Le board montre une carte unique qui regroupe prestations, zone, horaires et
 * congés, chacune en section, avec l'état courant lisible d'un coup d'œil. Les
 * écrans d'édition subsistent derrière chaque section : ils ne sont pas
 * supprimés, ils cessent d'être le point d'entrée.
 *
 * Tous les chiffres viennent de la base. Aucun n'est inventé, et un réglage
 * vide affiche l'état vide de la planche 7b plutôt qu'un zéro sans contexte.
 */

const A = copy.authentification

const jourCourt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  day: 'numeric',
  month: 'long',
})

export default async function Parametrage() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()

  const [prestations, communes, horaires, conges] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_min, active')
      .order('position')
      .order('name'),
    supabase.from('service_area_communes').select('insee_code, name').order('name'),
    supabase.from('working_hours').select('weekday, starts_at, ends_at').order('weekday'),
    supabase.from('time_off').select('id, starts_at, ends_at, label').order('starts_at'),
  ])

  // D9 : tant que les deux vérifications manquent, la rangée d'invite reste
  // dans le hub et la mise en ligne est désactivée. On nomme ce qui manque
  // plutôt que de dire « incomplet ».
  const { data: verifs } = await supabase
    .from('pros')
    .select('phone_verified_at')
    .eq('id', pro.id)
    .maybeSingle()
  const aVerifier = [
    auth.user?.email_confirmed_at ? null : 'ton e-mail',
    verifs?.phone_verified_at ? null : 'ton téléphone',
  ].filter((m): m is string => m !== null)

  const listePrestations = prestations.data ?? []
  const listeCommunes = communes.data ?? []
  const listeHoraires = horaires.data ?? []
  const listeConges = conges.data ?? []

  // Le chiffre que le paramétrage produit : le nombre d'heures ouvrables par
  // semaine. C'est la conséquence directe des quatre réglages, et c'est ce que
  // le moteur de créneaux a réellement à distribuer.
  const heuresParSemaine = listeHoraires.reduce((total, h) => {
    const minutes = enMinutes(h.ends_at) - enMinutes(h.starts_at)
    return total + Math.max(0, minutes)
  }, 0)

  const pret = listePrestations.length > 0 && listeCommunes.length > 0 && listeHoraires.length > 0

  return (
    <>
      <PanneauPlein
        statement={pret ? 'Ton activité tourne.' : 'On finit de t’installer.'}
        chiffre={heuresParSemaine > 0 ? formatHeures(heuresParSemaine) : undefined}
        legende={
          heuresParSemaine > 0
            ? `par semaine, réparties sur ${listeCommunes.length} commune${listeCommunes.length > 1 ? 's' : ''}`
            : 'Pose tes horaires pour que tes clientes puissent réserver.'
        }
      >
        <CarteCreme titre="Ton activité">
          {aVerifier.length > 0 ? (
            <LigneEtat
              principal={
                aVerifier.length === 2
                  ? A.$aEcrire.inviteVerification
                  : remplir(A.$aEcrire.invitePartielle, { reste: aVerifier[0] })
              }
              action="Vérifier"
              href={verifs?.phone_verified_at ? '/verification/email' : '/verification/telephone'}
            />
          ) : null}

          <EtiquetteSection>Prestations</EtiquetteSection>
          {listePrestations.length === 0 ? (
            <EtatVide
              titre="Aucune prestation."
              invitation="C’est ce que tes clientes choisissent en premier."
            >
              <BoutonPointille href="/app/parametrage/prestations" compact>
                + Ajouter une prestation
              </BoutonPointille>
            </EtatVide>
          ) : (
            <>
              {listePrestations.map((p) => (
                <LigneEtat
                  key={p.id}
                  principal={p.name}
                  secondaire={`${formatEuros(p.price_cents)} · ${p.duration_min} min${p.active ? '' : ' · masquée'}`}
                  action="Modifier"
                  href="/app/parametrage/prestations"
                />
              ))}
              <BoutonPointille href="/app/parametrage/prestations">
                + Ajouter une prestation
              </BoutonPointille>
            </>
          )}

          <EtiquetteSection>Zone d’intervention</EtiquetteSection>
          {listeCommunes.length === 0 ? (
            <EtatVide
              titre="Aucune commune."
              invitation="Sans zone, aucun créneau ne peut être proposé."
            >
              <BoutonPointille href="/app/parametrage/zone" compact>
                + Commune
              </BoutonPointille>
            </EtatVide>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {listeCommunes.map((c) => (
                <Pastille key={c.insee_code}>{c.name}</Pastille>
              ))}
              <BoutonPointille href="/app/parametrage/zone" compact>
                + Commune
              </BoutonPointille>
            </div>
          )}

          <EtiquetteSection>Horaires récurrents</EtiquetteSection>
          {listeHoraires.length === 0 ? (
            <EtatVide
              titre="Aucun horaire."
              invitation="Tes journées de travail, telles qu’elles sont vraiment."
            >
              <BoutonPointille href="/app/parametrage/horaires" compact>
                + Ajouter une plage
              </BoutonPointille>
            </EtatVide>
          ) : (
            <>
              {listeHoraires.map((h, i) => (
                <LigneEtat
                  key={`${h.weekday}-${h.starts_at}-${i}`}
                  principal={JOURS[h.weekday] ?? 'Jour inconnu'}
                  secondaire={`${h.starts_at.slice(0, 5)} à ${h.ends_at.slice(0, 5)}`}
                  action="Modifier"
                  href="/app/parametrage/horaires"
                />
              ))}
              <BoutonPointille href="/app/parametrage/horaires">
                + Ajouter une plage
              </BoutonPointille>
            </>
          )}

          <EtiquetteSection>Congés</EtiquetteSection>
          {listeConges.length === 0 ? (
            <LigneEtat
              principal="Aucun congé posé"
              secondaire="Ton agenda est ouvert sur toute la période."
              action="Poser un congé"
              href="/app/parametrage/conges"
            />
          ) : (
            <>
              {listeConges.map((c) => (
                <LigneEtat
                  key={c.id}
                  principal={`Du ${jourCourt.format(new Date(c.starts_at))} au ${jourCourt.format(new Date(c.ends_at))}`}
                  secondaire={c.label ?? undefined}
                  action="Modifier"
                  href="/app/parametrage/conges"
                />
              ))}
              <BoutonPointille href="/app/parametrage/conges">+ Ajouter des congés</BoutonPointille>
            </>
          )}

          <EtiquetteSection>Ta page de réservation</EtiquetteSection>
          <LigneEtat
            principal={pro.published ? 'En ligne' : 'Pas encore publiée'}
            secondaire={pro.published ? `wiggy.fr/${pro.slug}` : 'Personne ne peut la voir.'}
            action="Modifier"
            href="/app/parametrage/profil"
          />
        </CarteCreme>
      </PanneauPlein>
    </>
  )
}

const enMinutes = (heure: string) => {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

/** « 38 h » ou « 38 h 30 ». Jamais « 38.5 h » : personne ne lit ses horaires ainsi. */
function formatHeures(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
