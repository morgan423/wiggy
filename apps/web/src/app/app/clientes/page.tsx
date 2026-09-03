import Link from 'next/link'
import { ZONE, visitesEffectives, depuisQuand } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import {
  EnteteEcran,
  CorpsEcran,
  EtatVide,
  RANGEE,
  RANGEE_ACTIVABLE,
} from '@/components/composition'
import { Avatar } from '@/components/avatar'
import { ChampGet } from '@/components/champ-get'

/**
 * B1 — la liste des fiches clientes. Planche 16c, encart « CAS LONG & LISTE ».
 *
 * Recherche et tri par dernière visite : c'est ainsi qu'une pro cherche, par
 * « celle que j'ai vue la dernière fois » avant « celle dont je me rappelle le
 * nom ».
 *
 * L'état vide n'accuse personne : les fiches se créent toutes seules à la
 * première réservation. Le pro n'a jamais de fiche à saisir.
 */

const F = copy.ficheCliente

const mois = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, month: 'long', year: 'numeric' })

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requirePro()
  const { q } = await searchParams
  const recherche = (q ?? '').trim()

  const supabase = await supabaseServer()
  const [{ data: clientes }, { data: rdvs }] = await Promise.all([
    supabase.from('clients').select('id, first_name, last_name, phone').order('first_name'),
    supabase.from('appointments').select('client_id, starts_at, status'),
  ])

  const liste = clientes ?? []
  // Une seule lecture des rendez-vous, regroupée ici : une requête par fiche
  // ferait autant d'allers-retours que de clientes.
  const visitesPar = new Map<string, { debut: Date; annulee: boolean }[]>()
  for (const r of rdvs ?? []) {
    if (!r.client_id) continue
    const visites = visitesPar.get(r.client_id) ?? []
    visites.push({ debut: new Date(r.starts_at), annulee: r.status === 'cancelled' })
    visitesPar.set(r.client_id, visites)
  }

  const filtrees = liste
    .filter((c) => !recherche || nomComplet(c).toLowerCase().includes(recherche.toLowerCase()))
    .map((c) => {
      const visites = visitesPar.get(c.id) ?? []
      const passees = visites.filter((v) => !v.annulee).map((v) => v.debut.getTime())
      return {
        ...c,
        visites,
        derniere: passees.length > 0 ? Math.max(...passees) : 0,
      }
    })
    // Par dernière visite : la plus récente d'abord. Celles qui ne sont jamais
    // venues ferment la liste, elles ne s'effacent pas.
    .sort((a, b) => b.derniere - a.derniere)

  return (
    <>
      <EnteteEcran variante="jour" statement={F.liste.titre} />
      <CorpsEcran serre>
        {liste.length === 0 ? (
          <EtatVide titre={F.liste.videTitre} invitation={F.$aEcrire.videInvitation} />
        ) : (
          <>
            <form method="get">
              <ChampGet
                id="q"
                label={F.$aEcrire.recherche}
                defaultValue={recherche}
                required={false}
              />
            </form>

            {filtrees.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-texte-attenue">
                {F.$aEcrire.aucunResultat}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtrees.map((c) => {
                  const nb = visitesEffectives(c.visites)
                  const depuis = depuisQuand(c.visites)
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/app/clientes/${c.id}`}
                        className={`${RANGEE} ${RANGEE_ACTIVABLE}`}
                      >
                        <Avatar nom={nomComplet(c)} taille="sm" />
                        <span className="flex min-w-0 flex-1 flex-col gap-px">
                          <span className="text-[13.5px] font-bold">{nomComplet(c)}</span>
                          <span className="text-[11.5px] text-texte-attenue">
                            {depuis
                              ? remplir(F.$aEcrire.resumeSimple, {
                                  n: String(nb),
                                  depuis: mois.format(depuis),
                                })
                              : F.$aEcrire.jamaisVenue}
                          </span>
                        </span>
                        <span aria-hidden className="shrink-0 text-[12px] text-texte-attenue">
                          ›
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </CorpsEcran>
    </>
  )
}

/**
 * S6 : le prénom est le héros. Le nom de famille suit quand il existe, il ne
 * commande pas l'affichage.
 */
function nomComplet(c: { first_name: string; last_name: string | null }): string {
  return `${c.first_name} ${c.last_name ?? ''}`.trim()
}
