#!/usr/bin/env bash
#
# Zip de resynchronisation pour une session de pilotage stratégique.
#
# TEXTE UNIQUEMENT. Aucun binaire, aucun node_modules, aucun build : la session
# qui reçoit ce zip lit, elle ne compile pas. Un PDF ou une capture d'écran y
# coûterait des mégaoctets pour une information qu'elle ne peut pas exploiter.
#
# Le contenu est rassemblé depuis TROIS endroits, parce que les documents du
# projet y vivent réellement :
#   · ~/Documents/Wiggy/Docs      les documents projet (roadmap, briefs)
#   · ~/Documents/Wiggy/Juridique la conformité
#   · le dépôt                    decisions.md, journal.md, copy deck, jetons
#
# Usage : bash scripts/zip-resync.sh
set -euo pipefail

RACINE_WIGGY="/Users/morgan/Documents/Wiggy"
DEPOT="$RACINE_WIGGY/Dev/wiggy"
HORODATAGE="$(date +%Y-%m-%d)"
ATELIER="$(mktemp -d)/wiggy-resync-$HORODATAGE"
trap 'rm -rf "$(dirname "$ATELIER")"' EXIT

mkdir -p "$ATELIER"/{docs-projet,juridique,docs-technique,copy-deck,tokens}

# Les extensions retenues. Tout le reste est écarté, y compris ce qu'on n'a pas
# prévu : une liste blanche ne laisse pas passer le binaire qu'on découvrira
# demain, là où une liste noire l'oublierait.
TEXTE=(-name '*.md' -o -name '*.txt' -o -name '*.json' -o -name '*.csv' \
       -o -name '*.html' -o -name '*.css' -o -name '*.sql' -o -name '*.mjs' -o -name '*.ts')

# `Wiggy Univers Design.html` pèse 1,4 Mo à lui seul, soit l'essentiel du zip.
# C'est le board de design : il fait foi pour la composition, et il n'apprend
# rien à une session de pilotage. `--sans-design` le laisse dehors.
SANS_DESIGN=""
SUFFIXE=""
if [ "${1:-}" = "--sans-design" ]; then
  SANS_DESIGN=1
  # Un nom distinct : sans lui, la variante allégée ÉCRASE le zip complet, et
  # on croit avoir les deux quand on n'en a qu'un.
  SUFFIXE="-leger"
fi
SORTIE="$RACINE_WIGGY/wiggy-resync-$HORODATAGE$SUFFIXE.zip"

# Copie en PRÉSERVANT l'arborescence relative. Aplatir serait dangereux ici :
# `Docs/` contient deux fichiers nommés `roadmap-wiggy.md`, dont un instantané
# périmé du 30 août. Sans le chemin, la session qui lit ce zip ne peut pas
# distinguer la roadmap vivante de la morte.
copier_texte() { # dossier_source dossier_cible
  [ -d "$1" ] || { echo "  (absent : $1)"; return 0; }
  find "$1" -type f \( "${TEXTE[@]}" \) -print0 |
    while IFS= read -r -d '' f; do
      relatif="${f#"$1"/}"
      mkdir -p "$2/$(dirname "$relatif")"
      cp "$f" "$2/$relatif"
    done
}

echo "① Documents projet"
copier_texte "$RACINE_WIGGY/Docs" "$ATELIER/docs-projet"
echo "② Conformité juridique"
copier_texte "$RACINE_WIGGY/Juridique" "$ATELIER/juridique"
echo "③ Documents techniques du dépôt"
cp "$DEPOT"/docs/*.md "$ATELIER/docs-technique/"
cp "$DEPOT/CLAUDE.md" "$ATELIER/"
cp "$DEPOT/packages/copy/MANQUES.md" "$ATELIER/"
[ -f "$DEPOT/README.md" ] && cp "$DEPOT/README.md" "$ATELIER/"

echo "④ Copy deck"
cp "$DEPOT"/packages/copy/ecrans/*.json "$ATELIER/copy-deck/"

echo "⑤ Jetons de design"
cp "$DEPOT"/packages/tokens/*.json "$DEPOT"/packages/tokens/*.css "$ATELIER/tokens/" 2>/dev/null || true
cp -R "$DEPOT/packages/tokens/src" "$ATELIER/tokens/" 2>/dev/null || true

echo "⑥ Arborescence du code (sans le code)"
# `tree` n'est pas installé sur cette machine, et l'exiger ferait échouer la
# commande chez qui ne l'a pas. `find` donne la même chose et existe partout.
{
  echo "Arborescence de $DEPOT, 3 niveaux, hors node_modules et builds."
  echo "Générée le $HORODATAGE. La structure, jamais le code."
  echo
  cd "$DEPOT"
  find . -maxdepth 3 \
    \( -name node_modules -o -name .git -o -name .next -o -name .expo \
       -o -name dist -o -name captures -o -name coverage \) -prune -o -print |
    sort | sed -e 's|[^/]*/|  |g'
} > "$ATELIER/arborescence.txt"

if [ -n "$SANS_DESIGN" ]; then
  rm -f "$ATELIER/docs-projet/Wiggy Univers Design.html"
  echo "   (board de design écarté : --sans-design)"
fi

echo "⑦ Repères de lecture"
cat > "$ATELIER/LISEZ-MOI.md" <<'FIN'
# Resynchronisation Wiggy

Instantané **texte uniquement** du projet, pour une session de pilotage. Aucun binaire, aucun
code source : la structure du code est dans `arborescence.txt`, pas les fichiers eux-mêmes.

## Ce qui fait foi

| Question                        | Le fichier qui répond                          |
| ------------------------------- | ---------------------------------------------- |
| Que construit-on, et dans quel ordre ? | `docs-projet/roadmap-wiggy.md` |
| Qu'a-t-on tranché, et pourquoi ? | `docs-technique/decisions.md` |
| Qu'a-t-on fait, jour par jour ? | `docs-technique/journal.md` |
| Comment travaille-t-on ?        | `CLAUDE.md` |
| Que dit-on à l'écran ?          | `copy-deck/*.json`, et `MANQUES.md` pour ce qui manque |
| Où en est la conformité ?       | `juridique/conformite-juridique-wiggy.md` |

## ⚠️ Deux pièges dans ce zip

1. **`docs-projet/Design phase 2/roadmap-wiggy.md` est PÉRIMÉ** (instantané du 30 août, 41 Ko).
   La roadmap vivante est `docs-projet/roadmap-wiggy.md` (114 Ko). Les deux portent le même nom :
   c'est le chemin qui les distingue.
2. **`docs-projet/Wiggy Univers Design.html`** est le board de design, 1,4 Mo d'HTML à styles
   en ligne. Il fait foi pour la composition des écrans et n'apprend rien sur la stratégie.

## Ce qui n'est PAS là

Le code, les migrations SQL, les captures de recette, les PDF et les polices. Rien de tout cela
ne se lit utilement dans une session de pilotage, et tout cela pèse.
FIN

echo "⑧ Compression"
# ⚠️ `zip` AJOUTE à une archive existante au lieu de la remplacer. Sans cette
# suppression, relancer le script le lendemain empilerait deux instantanés dans
# le même fichier, et la session recevrait deux roadmaps de dates différentes
# sans le savoir. Constaté en relançant le script, pas supposé.
rm -f "$SORTIE"
( cd "$(dirname "$ATELIER")" && zip -rq "$SORTIE" "$(basename "$ATELIER")" -x '*.DS_Store' )

echo
echo "→ $SORTIE"
du -h "$SORTIE" | cut -f1 | sed 's/^/   poids : /'
echo "   fichiers : $(unzip -l "$SORTIE" | tail -1 | awk '{print $2}')"
