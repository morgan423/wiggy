# Vulnérabilités de dépendances : état et arbitrages

> Relu à chaque `npm audit`. Une exception sans preuve écrite se retire, elle ne se conserve pas.

## État au 04/09/2026

| Portée                            | Résultat                       |
| --------------------------------- | ------------------------------ |
| `apps/web` (la webapp de la bêta) | **0 vulnérabilité**            |
| Monorepo entier                   | 10 modérées, toutes ci-dessous |

## L'exception unique : `uuid` via la chaîne Expo

**Les dix remontées sont la même**, comptée une fois par paquet qui en dépend :

```
@wiggy/pro → expo → @expo/config-plugins → xcode@3.0.1 → uuid@7.0.3
```

L'avis est [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) : contrôle de
bornes manquant dans `uuid` **v3, v5 et v6 lorsqu'un tampon est fourni**.

**Quatre constats, vérifiés et non supposés :**

1. **Le chemin vulnérable n'est pas atteignable.** `xcode` n'appelle que `uuid.v4()`, sans tampon
   (`node_modules/xcode/lib/pbxProject.js:90`). Ni `v3`, ni `v5`, ni `v6`, ni tampon.
2. **C'est une dépendance de CONSTRUCTION**, pas d'exécution : `xcode` sert à la préparation du
   projet iOS d'Expo. Elle ne tourne dans aucun serveur, dans aucun navigateur, et ne voit jamais
   la donnée d'une cliente.
3. **Elle vit dans `apps/pro`, hors du périmètre de la bêta** (D4 : la bêta tourne sur la PWA,
   l'enveloppe native se construit après). La webapp qui accueillera de vraies données est à zéro.
4. **Aucune version corrigée n'existe.** `xcode@3.0.1` est la **dernière publiée** ; le correctif
   supposerait que ce paquet, non maintenu, relève sa dépendance.

**Ce qui a été tenté et écarté, le 04/09 :**

- un `overrides` npm sur `uuid`, en forme globale puis en forme imbriquée (`xcode` → `uuid`), avec
  régénération du verrou : **npm n'applique ni l'une ni l'autre** dans ce montage d'espaces de
  travail, et laisse `uuid@7.0.3` marqué `invalid`. **Un correctif qui ne corrige pas a été
  retiré** : il aurait affiché une sécurité qui n'existe pas, ce qui est pire que l'exception
  documentée ;
- `npm audit fix --force` : il propose de casser la chaîne Expo entière pour un chemin de code que
  personne n'appelle. Le remède serait plus dangereux que le mal, à la veille d'une bêta.

**À rouvrir** quand l'enveloppe native se construira (après la bêta, D4) : si `xcode` n'a toujours
pas bougé, on regardera si Expo peut s'en passer. La question redeviendra réelle le jour où ce code
tournera pour de bon.

## La règle

**Une vulnérabilité ne se classe jamais « acceptable » sans les quatre réponses ci-dessus** :
le chemin est-il atteignable, le code tourne-t-il en production, touche-t-il de la donnée réelle,
une version corrigée existe-t-elle. Sans les quatre, on corrige.
