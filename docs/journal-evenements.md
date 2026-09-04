# Inventaire des événements journalisables

> **Fichier généré** par `npm run journal:inventaire`, depuis le registre de
> `packages/core/src/journal.ts` et les appels réels à `journaliser()`.
> Ne pas le modifier à la main.

**Trois niveaux, et un seul n'est pas réglable.** Le **journal** reçoit tout, toujours, et ne se
désactive pas : un registre qu'on peut couper crée des trous invisibles, et la pro ne sait pas ce
qu'elle ne voit pas. Le **badge** et le **push** se règlent événement par événement.

**La règle des défauts de push**, qui tranche aussi les cas futurs : on interrompt quand
l'événement **change l'agenda ou attend une action**, jamais quand il est seulement **agréable à
savoir**. Un avis à cinq étoiles fait plaisir, il n'appelle rien, il n'a pas à interrompre une
prestation. Le défaut n'est pas saisi événement par événement, il est **calculé** depuis la nature
déclarée : c'est ce qui empêche la règle de se perdre au fil des ajouts.

| Événement | Clé | État | Canaux | Où c'est écrit |
|---|---|---|---|---|
| Nouveau rendez-vous | `nouveau_rdv` | ✅ branché | journal toujours · badge par défaut · push ACTIF | `apps/web/src/app/[slug]/reserver/actions.ts:266` |
| Nouvelle demande | `demande_a_valider` | ✅ branché | journal toujours · badge par défaut · push ACTIF | `apps/web/src/app/app/agenda/actions.ts:281`<br>`apps/web/src/app/[slug]/reserver/actions.ts:266` |
| Réponse à ta proposition | `reponse_cliente` | ✅ branché | journal toujours · badge par défaut · push ACTIF | `apps/web/src/app/proposition/[token]/actions.ts:86` |
| Annulation | `annulation` | ✅ branché | journal toujours · badge par défaut · push ACTIF | `apps/web/src/app/app/agenda/actions.ts:125` |
| Nouvel avis | `avis` | ✅ branché | journal toujours · badge par défaut · push inactif | `apps/web/src/app/demande/[token]/avis-actions.ts:76` |
| Acompte reçu | `acompte` | ⏳ en attente de B9 | journal toujours · badge par défaut · push inactif | — |

## Ce que « en attente » veut dire

Ces événements ne sont **pas simulés**. Leur fonctionnalité n'existe pas : il n'y a ni avis (A7) ni
encaissement (B9) à journaliser. Leur ligne de réglage est visible et marquée « bientôt » plutôt
que masquée, parce qu'un réglage sans émetteur ment moins s'il l'annonce.

## La règle permanente

**Toute fonctionnalité qui produit un fait accompli intéressant la pro DOIT journaliser.** Et le
corollaire, qui protège la distinction de la planche 17a : **le journal reçoit des faits accomplis,
au passé, jamais des choses à faire.** Ce qui appelle une action va dans « À décider ».
