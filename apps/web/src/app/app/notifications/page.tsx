import Link from 'next/link'
import { ZONE } from '@wiggy/core'
import { copy, remplir } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { Cloche } from '@/components/cloche'
import { EnteteEcran, CorpsEcran, EtatVide, EtiquetteSection } from '@/components/composition'
import { RETENTION_JOURS } from '@/lib/notifications'
import { ToutMarquerLu } from './form'

/**
 * B14 — le journal, planche 17a.
 *
 * ⚠️ **On n'agit jamais depuis la cloche.** L'épingle abricot en tête RENVOIE
 * vers « À décider » de l'agenda : elle ne duplique ni les cartes, ni les
 * boutons. C'est la règle des deux endroits, et elle décide de tout cet écran.
 *
 *   · « À décider » (agenda) : la file d'action. Des demandes, des boutons, des
 *     décisions.
 *   · La cloche : le journal. Des faits accomplis, au passé, **sans bouton
 *     d'action**. Neutre, chronologique.
 */

const N = copy.notificationCopilote

const jourLong = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default async function Notifications() {
  await requirePro()
  const supabase = await supabaseServer()

  const limite = new Date(Date.now() - RETENTION_JOURS * 86_400_000).toISOString()
  const [{ data: lignes }, { count: aDecider }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, kind, titre, detail, lien, lu_le, created_at')
      .gte('created_at', limite)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'conditional'])
      .gte('starts_at', new Date().toISOString()),
  ])

  const journal = lignes ?? []
  const nonLus = journal.filter((l) => l.lu_le === null).length

  return (
    <>
      {/* D17 ⑤ : aucun lien de retour. La cloche est devenue une croix, et
          c'est elle qui referme le panneau, là où il s'est ouvert. */}
      <EnteteEcran variante="jour" statement={N.cloche.titre} cloche={<Cloche />} />
      <CorpsEcran serre>
        {/*
          L'épingle. Elle RENVOIE, elle ne duplique pas : ni carte, ni bouton.
          Agir se fait dans l'agenda, savoir se fait ici.
        */}
        {aDecider && aDecider > 0 ? (
          <Link
            href="/app/agenda?vue=jour"
            className="flex items-center justify-between gap-2.5 rounded-carte bg-attente px-3.5 py-3 hover:opacity-90"
          >
            <span className="text-[13px] font-bold">
              {remplir(N.$aEcrire.epingleADecider, { n: String(aDecider) })}
            </span>
            <span aria-hidden className="shrink-0 text-[14px]">
              ›
            </span>
          </Link>
        ) : null}

        {journal.length === 0 ? (
          <EtatVide titre={N.cloche.videTitre} invitation={N.cloche.videDetail} />
        ) : (
          <>
            {nonLus > 0 ? <ToutMarquerLu /> : null}
            {grouperParJour(journal).map(([jour, lignesDuJour]) => (
              <div key={jour} className="flex flex-col gap-2">
                <EtiquetteSection>{libelleJour(jour)}</EtiquetteSection>
                {lignesDuJour.map((l) => (
                  <Ligne key={l.id} ligne={l} />
                ))}
              </div>
            ))}
          </>
        )}
      </CorpsEcran>
    </>
  )
}

type LigneJournal = {
  id: string
  titre: string
  detail: string | null
  lien: string | null
  lu_le: string | null
  created_at: string
}

/**
 * Une ligne du journal. **Aucun bouton d'action** : au mieux un lien vers ce
 * dont elle parle, jamais une décision à prendre ici.
 */
function Ligne({ ligne }: { ligne: LigneJournal }) {
  const contenu = (
    <>
      <span className={`text-[12.5px] ${ligne.lu_le === null ? 'font-bold' : ''}`}>
        {ligne.titre}
      </span>
      {ligne.detail ? (
        <span className="text-[11.5px] text-texte-attenue">{ligne.detail}</span>
      ) : null}
    </>
  )
  const classes = `flex flex-col gap-px rounded-[14px] bg-surface px-3 py-2.5 ${
    ligne.lu_le === null ? '' : 'opacity-70'
  }`
  return ligne.lien ? (
    <Link href={ligne.lien} className={`${classes} hover:bg-fond`}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  )
}

/** Le journal se lit par jour, du plus récent au plus ancien. */
function grouperParJour(lignes: LigneJournal[]): [string, LigneJournal[]][] {
  const jours = new Map<string, LigneJournal[]>()
  for (const l of lignes) {
    const cle = l.created_at.slice(0, 10)
    jours.set(cle, [...(jours.get(cle) ?? []), l])
  }
  return [...jours.entries()]
}

/** « Aujourd'hui », « Hier », puis la date. C'est ainsi qu'on parle d'hier. */
function libelleJour(cle: string): string {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (cle === aujourdhui) return N.cloche.aujourdhui
  if (cle === hier) return N.cloche.hier
  return jourLong.format(new Date(cle))
}
