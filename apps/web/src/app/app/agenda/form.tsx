'use client'

import { useActionState, useState } from 'react'
import { Champ, Zone, Choix, Erreur, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'

type Prestation = { id: string; name: string; price_cents: number; duration_min: number }
type Cliente = { id: string; first_name: string; last_name: string | null }

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
}: {
  prestations: Prestation[]
  clientes: Cliente[]
  valeurs: ValeursRdv
  action: (precedent: EtatForm, donnees: FormData) => Promise<EtatForm>
  libelle: string
  edition?: boolean
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(actionServeur, VIDE)
  const [prestation, setPrestation] = useState<Prestation | null>(null)
  const [nouvelleCliente, setNouvelleCliente] = useState(!edition && clientes.length === 0)

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
          <Choix
            id="client_id"
            label="Fiche"
            options={clientes.map((c) => ({
              valeur: c.id,
              texte: `${c.first_name} ${c.last_name ?? ''}`.trim(),
            }))}
          />
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
        <Champ
          id="address_line1"
          label="Adresse"
          required={false}
          autoComplete="off"
          defaultValue={repris('address_line1', valeurs.address_line1)}
        />
        <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
          <Champ
            id="postal_code"
            label="Code postal"
            required={false}
            defaultValue={repris('postal_code', valeurs.postal_code)}
          />
          <Champ
            id="city"
            label="Ville"
            required={false}
            defaultValue={repris('city', valeurs.city)}
          />
        </div>
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
