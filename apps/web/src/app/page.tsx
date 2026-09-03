import Link from 'next/link'

/**
 * Home — correctifs S4, S5, S7, S8 respectés dès l'écriture.
 *
 * Registres (S6) : la home s'adresse d'abord au pro, donc au tutoiement.
 * Le bloc « côté cliente » change d'interlocuteur et passe au vouvoiement —
 * la frontière est marquée dans le code pour qu'elle ne se brouille pas.
 */

// S8, révisé le 03/09 : la grille est 19,90 € Essentielle, 34,90 € Tournée,
// 49 € Intelligence. La home affiche l'offre héros.
const PRIX_TTC = '34,90 € TTC/mois'
const ESSAI_JOURS = 30

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-extrabold tracking-tight">Wiggy</span>
        <Link
          href="/connexion"
          className="rounded-pilule px-4 py-2 text-sm font-semibold text-prune-claire hover:text-action"
        >
          Se connecter
        </Link>
      </header>

      <main>
        {/* ---------------------------------------------------------------
            Hero — S4 : le claim acté remplace « rappels anti lapin ».
            --------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-20 sm:pt-20">
          {/* Claim ratifié en phase 2. « Ta tournée s’organise toute seule. »
              devient le claim descriptif des pages produit.
              `statement` porte l’axe WONK — réservé au site, jamais en UI. */}
          <h1 className="statement max-w-4xl tracking-tight">Tes journées, bouclées.</h1>
          <p className="mt-8 max-w-xl text-lg text-texte-secondaire sm:text-xl">
            Wiggy remplit ton agenda en tournées logiques, tout seul. Toi, tu coiffes.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/inscription"
              className="rounded-pilule bg-action px-8 py-4 text-center text-lg font-bold text-texte-sur-plein transition-colors hover:bg-action-survol active:bg-action-pressee"
            >
              Essayer {ESSAI_JOURS} jours
            </Link>
            {/* S7 : le CTA cliente mène à la recherche par ville + liste
                d'attente (A9), jamais à un annuaire vide. */}
            <Link
              href="/recherche"
              className="rounded-pilule border-2 border-trait-discret px-8 py-4 text-center text-lg font-semibold hover:border-prune"
            >
              Trouver une coiffeuse ou un coiffeur
            </Link>
          </div>
        </section>

        {/* Blocs éditoriaux contrastés, une idée par bloc (brief DA). */}
        <section className="bg-prune px-6 py-20 text-texte-sur-plein">
          <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-3">
            <Argument titre="Une journée, un trajet">
              Tes rendez-vous du jour s’enchaînent dans l’ordre qui a du sens géographiquement. Les
              temps de trajet sont comptés, pas devinés.
            </Argument>
            <Argument titre="Une page à partager">
              Ta page de réservation vit dans ta bio Insta, tes messages, ta fiche Google. Tes
              clientes réservent seules, tu ne rappelles plus personne.
            </Argument>
            <Argument titre="Tu gardes la main">
              {/* Principe non négociable n°1, dit en clair. */}
              L’app propose, tu disposes. Un créneau que tu ne veux pas, tu le bloques. Un message
              qui part, c’est toi qui le valides.
            </Argument>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Changement d'interlocuteur : ici on parle à la cliente finale.
            Vouvoiement chaleureux (S6).
            --------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-carte bg-fond p-10 sm:p-16">
            <h2 className="display max-w-2xl tracking-tight">
              Vous cherchez une coiffeuse ou un coiffeur à domicile&nbsp;?
            </h2>
            <p className="mt-5 max-w-xl text-lg text-texte-secondaire">
              Dites-nous votre ville. Si un professionnel y intervient, vous réservez en deux
              minutes. Sinon, nous vous prévenons dès qu’un professionnel s’installe près de chez
              vous.
            </p>
            <Link
              href="/recherche"
              className="mt-8 inline-block rounded-pilule bg-prune px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-prune-survol"
            >
              Chercher dans ma ville
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Prix — S8 : mention TTC explicite.
            S5 : aucune mention de commission. On ne dit rien.
            --------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-carte border-2 border-trait-discret p-10 sm:p-16">
            <p className="text-sm font-semibold tracking-widest text-texte-secondaire uppercase">
              Côté pro
            </p>
            <p className="display mt-4 tracking-tight">{PRIX_TTC}, tout compris</p>
            <p className="mt-5 max-w-lg text-lg text-texte-secondaire">
              {ESSAI_JOURS} jours d’essai. Résiliation en deux taps, quand tu veux.
            </p>
            <Link
              href="/inscription"
              className="mt-8 inline-block rounded-pilule bg-action px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-action-survol active:bg-action-pressee"
            >
              Commencer l’essai
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-trait-discret px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-texte-secondaire">
          <span className="font-semibold text-prune">Wiggy</span>
          <span>La beauté à domicile, organisée.</span>
        </div>
      </footer>
    </>
  )
}

function Argument({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="titre tracking-tight">{titre}</h3>
      <p className="mt-3 text-fond/75">{children}</p>
    </div>
  )
}
