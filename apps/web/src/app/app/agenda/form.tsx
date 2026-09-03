'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { Champ, Zone, Erreur, BoutonPrincipal } from '@/components/champs'
import { ListeDeroulante } from '@/components/trousse'
import { ChampAdresse } from '@/components/champ-adresse'
import { VIDE, type EtatForm } from '@/lib/forms'

type Prestation = { id: string; name: string; price_cents: number; duration_min: number }
type Cliente = {
  id: string
  first_name: string
  last_name: string | null
  /** Dernière adresse connue, reprise de son dernier rendez-vous. */
  adresse?: { address_line1: string | null; postal_code: string | null; city: string | null }
  /** B2 — la mémoire technique, pré-affichée dès que la fiche est choisie. */
  technical_notes?: string | null
}

/** Valeurs de départ, vides à la création, celles du rendez-vous à l'édition. */
export type ValeursRdv = {
  id?: string
  client_id?: string | null
  service_id?: string | null
  service_name?: string
  prix?: string
  duree?: string
  debut: string
  address_line1?: string | null
  postal_code?: string | null
  city?: string | null
  access_notes?: string | null
  note?: string | null
}

/**
 * B10 — saisie d'un rendez-vous en quelques taps.
 *
 * Choisir une prestation pré-remplit prix et durée : ce sont des valeurs de
 * départ, pas des verrous. Le pro les corrige librement, y compris pour un
 * rendez-vous qu'il sait plus long — « l'app propose, le pro dispose ».
 */
export function FormRdv({
  prestations,
  clientes,
  valeurs,
  action: actionServeur,
  libelle,
  edition = false,
  clientePreChoisie = null,
  prestationPreChoisie = null,
}: {
  prestations: Prestation[]
  clientes: Cliente[]
  valeurs: ValeursRdv
  action: (precedent: EtatForm, donnees: FormData) => Promise<EtatForm>
  libelle: string
  edition?: boolean
  /** Fiche pré-sélectionnée, quand on arrive depuis « Nouveau rendez-vous ». */
  clientePreChoisie?: string | null
  /** C7 : la prestation du rendez-vous qu'on vient de clore. */
  prestationPreChoisie?: string | null
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(actionServeur, VIDE)
  const [prestation, setPrestation] = useState<Prestation | null>(
    prestations.find((p) => p.id === prestationPreChoisie) ?? null,
  )
  // R2-7 bis ② : l'adresse est obligatoire, mais pour une cliente déjà connue
  // elle ne doit rien coûter. Choisir sa fiche remplit les trois champs avec
  // sa dernière adresse connue, et le pro reste libre de les corriger.
  const [adresse, setAdresse] = useState<{ ligne: string; cp: string; ville: string } | null>(null)
  const [nouvelleCliente, setNouvelleCliente] = useState(!edition && clientes.length === 0)
  /**
   * R3-1, ouvert depuis la recette 3 : la liste des fiches s'ouvrait sur un nom
   * que personne n'avait choisi, et sans ses informations. Deux défauts en un.
   *
   * ① La liste native `Choix` affichait sa première option, si bien que le
   *    formulaire présentait une cliente sélectionnée par l'ordre alphabétique.
   *    `ListeDeroulante` impose une option neutre : rien n'est choisi tant que
   *    la pro n'a pas choisi.
   * ② Elle était NON CONTRÔLÉE : l'adresse ne se remplissait qu'au changement,
   *    donc jamais au premier rendu. L'état est ici, unique, et c'est lui qui
   *    est affiché ET soumis.
   */
  const [clienteId, setClienteId] = useState(clientePreChoisie ?? '')
  const clienteChoisie = clientes.find((c) => c.id === clienteId)

  // En cas d'erreur, on repart de ce que le pro venait de saisir plutôt que
  // d'un formulaire vide. `key` force le remontage : un champ non contrôlé
  // ignore un changement de `defaultValue` sans ça.
  const repris = (champ: string, defaut?: string | null) => etat.saisie?.[champ] ?? defaut ?? ''
  const clienteDuRdv = clientes.find((c) => c.id === valeurs.client_id)

  return (
    <form action={action} key={etat.n}>
      {valeurs.id ? <input type="hidden" name="id" value={valeurs.id} /> : null}
      <fieldset className="border-0 p-0">
        <legend className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
          La fiche
        </legend>

        {edition ? (
          <>
            <input type="hidden" name="client_id" value={valeurs.client_id ?? ''} />
            <p className="mt-4 text-texte-secondaire">
              {clienteDuRdv
                ? `${clienteDuRdv.first_name} ${clienteDuRdv.last_name ?? ''}`.trim()
                : 'Sans fiche'}
              . Pour la changer, annule ce rendez-vous et recrée-le.
            </p>
          </>
        ) : clientes.length > 0 ? (
          <label className="mt-4 flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={nouvelleCliente}
              onChange={(e) => {
                setNouvelleCliente(e.target.checked)
              }}
              className="size-5"
            />
            Nouvelle fiche
          </label>
        ) : null}

        {edition ? null : nouvelleCliente ? (
          <>
            <Champ
              id="client_nom"
              label="Prénom"
              autoComplete="off"
              defaultValue={repris('client_nom')}
            />
            <Champ
              id="client_tel"
              label="Téléphone"
              type="tel"
              required={false}
              defaultValue={repris('client_tel')}
            />
          </>
        ) : (
          <>
            <ListeDeroulante
              id="client_id"
              label="Fiche"
              valeur={clienteId}
              onValeur={(id) => {
                setClienteId(id)
                const choisie = clientes.find((c) => c.id === id)
                setAdresse(
                  choisie?.adresse
                    ? {
                        ligne: choisie.adresse.address_line1 ?? '',
                        cp: choisie.adresse.postal_code ?? '',
                        ville: choisie.adresse.city ?? '',
                      }
                    : null,
                )
              }}
              optionNeutre="Choisis dans tes fiches"
              options={clientes.map((c) => ({
                valeur: c.id,
                texte: `${c.first_name} ${c.last_name ?? ''}`.trim(),
              }))}
            />
            {/*
              R3-1 ② : la fiche choisie MONTRE ce qu'elle sait. Sans cela, le
              nom seul ne disait pas si c'était la bonne cliente, et l'adresse
              se remplissait plus bas sans qu'on comprenne pourquoi.
              B2 : ses notes techniques s'affichent ici, avant le rendez-vous.
            */}
            {clienteChoisie ? (
              <div className="mt-2 flex flex-col gap-1 rounded-[14px] bg-surface px-3 py-2.5 text-[12.5px] leading-[1.5]">
                {clienteChoisie.adresse?.address_line1 ? (
                  <span>
                    <span className="font-extrabold">{clienteChoisie.adresse.address_line1}</span>
                    {clienteChoisie.adresse.city ? `, ${clienteChoisie.adresse.city}` : ''}
                  </span>
                ) : null}
                {clienteChoisie.technical_notes ? (
                  <span>
                    <span className="font-extrabold">{copy.ficheCliente.notes.titre}</span> ·{' '}
                    {clienteChoisie.technical_notes}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </fieldset>

      <fieldset className="mt-10 border-0 p-0">
        <legend className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
          La prestation
        </legend>

        {prestations.length > 0 ? (
          <div className="mt-4">
            <label htmlFor="service_id" className="block text-sm font-semibold">
              Reprendre une de tes prestations
            </label>
            <select
              id="service_id"
              name="service_id"
              defaultValue={valeurs.service_id ?? ''}
              onChange={(e) => {
                setPrestation(prestations.find((p) => p.id === e.target.value) ?? null)
              }}
              className="mt-2 w-full rounded-champ border-2 border-trait-discret px-5 py-4 text-lg"
            >
              <option value="">Saisir librement</option>
              {prestations.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Champ
          id="service_name"
          label="Intitulé"
          key={`nom-${prestation?.id ?? 'libre'}`}
          defaultValue={prestation?.name ?? repris('service_name', valeurs.service_name)}
        />
        <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
          <Champ
            id="price_cents"
            label="Prix"
            key={`prix-${prestation?.id ?? 'libre'}`}
            defaultValue={
              prestation
                ? (prestation.price_cents / 100).toFixed(2).replace('.', ',')
                : repris('price_cents', valeurs.prix)
            }
            aide="En euros"
          />
          <Champ
            id="duration_min"
            label="Durée"
            type="number"
            key={`duree-${prestation?.id ?? 'libre'}`}
            defaultValue={
              prestation
                ? String(prestation.duration_min)
                : repris('duration_min', valeurs.duree ?? '60')
            }
            aide="En minutes"
          />
        </div>
      </fieldset>

      <fieldset className="mt-10 border-0 p-0">
        <legend className="text-sm font-bold tracking-widest text-texte-secondaire uppercase">
          Quand et où
        </legend>
        <Champ
          id="debut"
          label="Début"
          type="datetime-local"
          defaultValue={repris('debut', valeurs.debut)}
        />
        {/*
          R2-7 bis : l'adresse est obligatoire. Un rendez-vous sans lieu n'a pas
          de coordonnées, donc pas de trajet : le moteur de créneaux le traverse
          sans contrainte et la tournée se calcule sur une journée incomplète.
          Une adresse que le référentiel ne reconnaît pas est conservée telle
          quelle et rattachée au centre de sa commune : rien ne bloque.
        */}
        {/*
          B12 : le même composant que le tunnel cliente et que la zone
          d'intervention. C'est la saisie la plus fréquente de l'app côté pro :
          la faire en trois champs à taper était la rendre laborieuse.
        */}
        <ChampAdresse
          key={`adr-${adresse?.ligne ?? ''}`}
          id="adresse_rdv"
          label="Adresse"
          placeholder="12 rue des Lilas, Pau"
          aide="Où tu te déplaces. C’est ce qui fait entrer ce rendez-vous dans ta tournée."
          nomLigne="address_line1"
          nomCodePostal="postal_code"
          nomVille="city"
          defaut={{
            ligne: adresse?.ligne ?? repris('address_line1', valeurs.address_line1),
            codePostal: adresse?.cp ?? repris('postal_code', valeurs.postal_code),
            ville: adresse?.ville ?? repris('city', valeurs.city),
          }}
        />
        <Champ
          id="access_notes"
          label="Infos d’accès"
          required={false}
          defaultValue={repris('access_notes', valeurs.access_notes)}
          aide="Bâtiment, étage, digicode…"
        />
        <Zone
          id="note"
          label="Note pour ce rendez-vous"
          rows={3}
          defaultValue={repris('note', valeurs.note)}
        />
      </fieldset>

      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>{libelle}</BoutonPrincipal>
    </form>
  )
}
