'use client'

import { useState } from 'react'
import { Champ, Zone, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import {
  CaseACocher,
  ListeDeroulante,
  SaisieAssistee,
  SelecteurDate,
  SelecteurHeure,
} from '@/components/trousse'

/**
 * Le contenu de la galerie. Aucune donnée réelle : des noms de fantaisie, des
 * dates inventées, une source de recherche qui ne parle à personne.
 */

const FRUITS = [
  { valeur: 'abricot', texte: 'Abricot' },
  { valeur: 'framboise', texte: 'Framboise' },
  { valeur: 'prune', texte: 'Prune' },
]

const LONG =
  'Un libellé volontairement très long, pour voir ce qu’il devient quand la place manque et que rien ne doit déborder'

/** Source de démonstration : locale, immédiate, et sans le moindre réseau. */
const chercherFactice = (terme: string) =>
  Promise.resolve(
    ['Abricotier', 'Amandier', 'Framboisier', 'Prunier', 'Pêcher']
      .filter((n) => n.toLowerCase().startsWith(terme.toLowerCase().slice(0, 2)))
      .map((nom, i) => ({ id: `${nom}-${i}`, nom })),
  )

const chercherEnPanne = () => Promise.reject(new Error('source de démonstration indisponible'))

export function Galerie() {
  const [liste, setListe] = useState('')
  const [listeRemplie, setListeRemplie] = useState('framboise')
  const [date, setDate] = useState('')
  const [dateRemplie, setDateRemplie] = useState('2026-09-14')
  const [heure, setHeure] = useState('')
  const [heureRemplie, setHeureRemplie] = useState('14:30')
  const [choisi, setChoisi] = useState<string | null>(null)

  return (
    <>
      <p className="rounded-carte bg-attente/25 px-5 py-4 font-semibold">
        Page de démonstration. Aucune donnée réelle, aucun enregistrement, non indexée et fermée
        hors développement.
      </p>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">La trousse</h1>
      <p className="mt-3 text-texte-secondaire">
        Chaque composant dans ses états : vide, rempli, en erreur, désactivé, texte long. Pour le
        focus clavier, parcourir la page à la touche de tabulation : chaque élément doit montrer un
        contour net.
      </p>

      <Section titre="Champ de saisie">
        <Champ id="g-champ-vide" label="Vide" required={false} />
        <Champ
          id="g-champ-rempli"
          label="Rempli"
          defaultValue="Coupe et brushing"
          required={false}
        />
        <Champ
          id="g-champ-erreur"
          label="En erreur"
          defaultValue="42,5,0"
          required={false}
          fautif
          aide="Le champ fautif porte le curseur et une bordure brique."
        />
        <Champ
          id="g-champ-inactif"
          label="Désactivé"
          defaultValue="Non modifiable"
          required={false}
          desactive
        />
        <Champ id="g-champ-long" label={LONG} required={false} />
        <Zone id="g-zone" label="Zone de texte" aide="Plusieurs lignes, même rectangle." />
      </Section>

      <Section titre="Liste déroulante">
        <ListeDeroulante
          id="g-liste-vide"
          label="Vide, sur son option neutre"
          valeur={liste}
          onValeur={setListe}
          optionNeutre="Choisis une couleur"
          options={FRUITS}
          aide="Tant que l’option neutre est active, rien n’est retenu."
        />
        <ListeDeroulante
          id="g-liste-remplie"
          label="Remplie"
          valeur={listeRemplie}
          onValeur={setListeRemplie}
          optionNeutre="Choisis une couleur"
          options={FRUITS}
        />
        <ListeDeroulante
          id="g-liste-erreur"
          label="En erreur"
          valeur=""
          onValeur={() => undefined}
          optionNeutre="Choisis une couleur"
          options={FRUITS}
          fautif
        />
        <ListeDeroulante
          id="g-liste-inactive"
          label="Désactivée"
          valeur="prune"
          onValeur={() => undefined}
          optionNeutre="Choisis une couleur"
          options={FRUITS}
          desactive
        />
        <ListeDeroulante
          id="g-liste-longue"
          label="Texte long"
          valeur="long"
          onValeur={() => undefined}
          optionNeutre="Choisis"
          options={[{ valeur: 'long', texte: LONG }]}
        />
      </Section>

      <Section titre="Case à cocher">
        <CaseACocher id="g-case-vide" label="Décochée" />
        <CaseACocher id="g-case-cochee" label="Cochée" defaultChecked />
        <CaseACocher
          id="g-case-aide"
          label="Avec une aide"
          defaultChecked
          aide="La ligne d’aide s’aligne sous le libellé, pas sous la case."
        />
        <CaseACocher id="g-case-inactive" label="Désactivée" defaultChecked desactive />
        <CaseACocher id="g-case-longue" label={LONG} />
      </Section>

      <Section titre="Sélecteur de date">
        <SelecteurDate id="g-date-vide" label="Vide" valeur={date} onValeur={setDate} />
        <SelecteurDate
          id="g-date-remplie"
          label="Rempli"
          valeur={dateRemplie}
          onValeur={setDateRemplie}
        />
        <SelecteurDate
          id="g-date-erreur"
          label="En erreur"
          valeur=""
          onValeur={() => undefined}
          fautif
        />
        <SelecteurDate
          id="g-date-inactive"
          label="Désactivé"
          valeur="2026-12-25"
          onValeur={() => undefined}
          desactive
        />
      </Section>

      <Section titre="Sélecteur d’heure">
        <SelecteurHeure id="g-heure-vide" label="Vide" valeur={heure} onValeur={setHeure} />
        <SelecteurHeure
          id="g-heure-remplie"
          label="Rempli"
          valeur={heureRemplie}
          onValeur={setHeureRemplie}
        />
        <SelecteurHeure
          id="g-heure-erreur"
          label="En erreur"
          valeur=""
          onValeur={() => undefined}
          fautif
        />
        <SelecteurHeure
          id="g-heure-inactive"
          label="Désactivé"
          valeur="09:00"
          onValeur={() => undefined}
          desactive
        />
      </Section>

      <Section titre="Saisie assistée">
        <SaisieAssistee<{ id: string; nom: string }>
          id="g-assistee"
          label="Vide, puis au fil de la frappe"
          placeholder="Taper « ab », « fr », « pr »…"
          aide="Les résultats arrivent dès deux lettres, sans bouton."
          chercher={chercherFactice}
          cle={(item) => item.id}
          rendu={(item) => item.nom}
          onChoix={(item) => {
            setChoisi(item.nom)
          }}
          choisi={choisi ?? undefined}
          onEffacer={() => {
            setChoisi(null)
          }}
        />
        <SaisieAssistee<{ id: string; nom: string }>
          id="g-assistee-panne"
          label="Quand la source ne répond pas"
          placeholder="Taper deux lettres pour voir le chemin gracieux"
          aide="La saisie reste, rien n’est effacé, rien n’est bloqué."
          chercher={chercherEnPanne}
          cle={(item) => item.id}
          rendu={(item) => item.nom}
          onChoix={() => undefined}
        />
        <SaisieAssistee<{ id: string; nom: string }>
          id="g-assistee-inactive"
          label="Désactivée"
          chercher={chercherFactice}
          cle={(item) => item.id}
          rendu={(item) => item.nom}
          onChoix={() => undefined}
          desactive
        />
      </Section>

      <Section titre="Messages et bouton">
        <Erreur message="Un message d’erreur, factuel et orienté solution." />
        <Succes message="Un message de succès." />
        <BoutonPrincipal enCours={false}>Bouton principal</BoutonPrincipal>
        <BoutonPrincipal enCours>Bouton en cours</BoutonPrincipal>
      </Section>
    </>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-trait-discret pt-8">
      <h2 className="text-xl font-bold tracking-tight">{titre}</h2>
      <div className="max-w-md">{children}</div>
    </section>
  )
}
