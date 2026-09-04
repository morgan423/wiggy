'use client'

import { useState, useRef } from 'react'
import { lireVCard, lireCsv, preparerImport, type ContactImporte } from '@wiggy/core'
import { importerContacts } from './actions'

/**
 * Deux chemins, et le second est le principal.
 *
 * ① Le sélecteur natif du téléphone, **quand il existe** : deux taps, rien à
 *    exporter. `navigator.contacts` n'est présent que sur Chrome Android ; on
 *    le détecte, on ne le suppose pas.
 * ② **L'import d'un fichier**, partout ailleurs. Les deux systèmes savent
 *    exporter un carnet en vCard, un tableur exporte en CSV.
 *
 * ⚠️ **Rien n'est écrit sans que la pro ait vu ce qui sera créé.** Un import de
 * cent fiches qui part au premier tap est un import qu'on ne peut plus annuler,
 * et l'app propose, le pro dispose.
 */
type Etat =
  | { phase: 'choix' }
  | { phase: 'apercu'; contacts: ContactImporte[]; doublons: number; sansTelephone: number }
  | { phase: 'fait'; crees: number }
  | { phase: 'erreur'; message: string }

export function FormImport() {
  const [etat, setEtat] = useState<Etat>({ phase: 'choix' })
  const [enCours, setEnCours] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)

  // La détection, jamais la supposition. `contacts` et `ContactsManager` :
  // les deux sont nécessaires, et Safari n'a ni l'un ni l'autre.
  const selecteurNatif =
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

  async function depuisLeTelephone() {
    setEnCours(true)
    try {
      const brut = await (
        navigator as unknown as {
          contacts: {
            select: (
              props: string[],
              options: { multiple: boolean },
            ) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]>
          }
        }
      ).contacts.select(['name', 'tel', 'email'], { multiple: true })

      const contacts: ContactImporte[] = brut.map((c) => {
        const morceaux = (c.name?.[0] ?? '').trim().split(/\s+/)
        return {
          prenom: morceaux[0] || 'Sans nom',
          nom: morceaux.slice(1).join(' ') || undefined,
          telephone: c.tel?.[0],
          email: c.email?.[0],
        }
      })
      afficherApercu(contacts)
    } catch {
      // Une annulation par la pro passe aussi par ici : on revient au choix
      // sans rien dire, plutôt que d'annoncer une erreur qui n'en est pas une.
      setEtat({ phase: 'choix' })
    } finally {
      setEnCours(false)
    }
  }

  function depuisUnFichier(evenement: React.ChangeEvent<HTMLInputElement>) {
    const f = evenement.target.files?.[0]
    if (!f) return
    const lecteur = new FileReader()
    lecteur.onload = () => {
      // `result` peut être un ArrayBuffer selon la méthode de lecture. On l'a
      // lu en texte, mais le typage ne le sait pas et `String()` produirait
      // « [object ArrayBuffer] » plutôt qu'une erreur visible.
      const texte = typeof lecteur.result === 'string' ? lecteur.result : ''
      const contacts = /BEGIN:VCARD/i.test(texte) ? lireVCard(texte) : lireCsv(texte)
      if (contacts.length === 0) {
        setEtat({
          phase: 'erreur',
          message:
            'Aucun contact lu dans ce fichier. Vérifie qu’il vient bien d’un export de contacts (.vcf) ou qu’il a une colonne « Prénom ».',
        })
        return
      }
      afficherApercu(contacts)
    }
    lecteur.readAsText(f)
  }

  function afficherApercu(contacts: ContactImporte[]) {
    // Le dédoublonnage contre l'existant se refait côté serveur : celui-ci ne
    // sert qu'à montrer un aperçu honnête avant l'écriture.
    const { aCreer, doublons, sansTelephone } = preparerImport(contacts)
    setEtat({ phase: 'apercu', contacts: aCreer, doublons, sansTelephone })
  }

  async function confirmer(contacts: ContactImporte[]) {
    setEnCours(true)
    try {
      const crees = await importerContacts(contacts)
      setEtat({ phase: 'fait', crees })
    } finally {
      setEnCours(false)
    }
  }

  if (etat.phase === 'fait') {
    return (
      <p className="rounded-carte bg-celebration px-3.5 py-3 text-[13px] font-bold text-texte-sur-miel">
        {etat.crees === 0
          ? 'Elles étaient déjà toutes là. Rien à ajouter.'
          : `${String(etat.crees)} fiche${etat.crees > 1 ? 's' : ''} créée${etat.crees > 1 ? 's' : ''}.`}
      </p>
    )
  }

  if (etat.phase === 'apercu') {
    return (
      <div>
        <p className="text-[13px] leading-[1.5] font-bold">
          {etat.contacts.length} fiche{etat.contacts.length > 1 ? 's' : ''} à créer.
        </p>
        <p className="mt-1 text-[12px] leading-[1.5] text-texte-attenue">
          {etat.doublons > 0
            ? `${String(etat.doublons)} en double, ignorée${etat.doublons > 1 ? 's' : ''}. `
            : ''}
          {etat.sansTelephone > 0
            ? `${String(etat.sansTelephone)} sans numéro : gardée${etat.sansTelephone > 1 ? 's' : ''} quand même, tu compléteras.`
            : ''}
        </p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {etat.contacts.slice(0, 8).map((c, i) => (
            <li key={i} className="rounded-champ bg-surface px-3 py-2 text-[12.5px]">
              <span className="font-bold">
                {c.prenom} {c.nom ?? ''}
              </span>
              {c.telephone ? (
                <span className="ml-2 text-texte-attenue">{c.telephone}</span>
              ) : (
                <span className="ml-2 text-texte-attenue">sans numéro</span>
              )}
            </li>
          ))}
          {etat.contacts.length > 8 ? (
            <li className="px-3 text-[12px] text-texte-attenue">
              … et {etat.contacts.length - 8} autres.
            </li>
          ) : null}
        </ul>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={() => void confirmer(etat.contacts)}
            className="tactile flex-1 rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol disabled:bg-action-pressee"
          >
            {enCours ? 'Création…' : 'Créer ces fiches'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEtat({ phase: 'choix' })
            }}
            className="tactile rounded-pilule border-2 border-trait-discret px-4 text-[13px] font-bold"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {etat.phase === 'erreur' ? (
        <p className="rounded-carte bg-erreur/15 px-3.5 py-3 text-[12.5px] leading-[1.5] font-semibold text-erreur">
          {etat.message}
        </p>
      ) : null}

      {selecteurNatif ? (
        <button
          type="button"
          disabled={enCours}
          onClick={() => void depuisLeTelephone()}
          className="tactile w-full rounded-pilule bg-action py-[13px] text-center text-[14px] font-bold text-texte-sur-plein hover:bg-action-survol"
        >
          Choisir dans mes contacts
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => fichier.current?.click()}
        className={`tactile w-full rounded-pilule py-[13px] text-center text-[14px] font-bold ${
          selecteurNatif
            ? 'border-2 border-trait-discret'
            : 'bg-action text-texte-sur-plein hover:bg-action-survol'
        }`}
      >
        Importer un fichier de contacts
      </button>
      <input
        ref={fichier}
        type="file"
        accept=".vcf,.csv,text/vcard,text/csv"
        onChange={depuisUnFichier}
        className="hidden"
      />

      {/*
        On DIT pourquoi le fichier existe. Sans cette phrase, une pro sur iPhone
        croit avoir raté un bouton, alors que son téléphone ne le propose à
        personne.
      */}
      <p className="mt-2 text-[11.5px] leading-[1.55] text-texte-attenue">
        {selecteurNatif
          ? 'Le fichier sert si tu préfères passer par un export de ton carnet.'
          : 'Ton téléphone ne laisse pas les sites web lire ton carnet, et c’est très bien ainsi. Exporte tes contacts (partage en .vcf, ou un tableur en .csv) et dépose le fichier ici : il ne quitte pas ton téléphone avant que tu aies vu ce qui sera créé.'}
      </p>
    </div>
  )
}
