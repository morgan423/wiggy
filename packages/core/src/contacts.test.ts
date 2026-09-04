import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireVCard, lireCsv, preparerImport } from './contacts.ts'

const VCARD = `BEGIN:VCARD
VERSION:3.0
N:Dupont;Marie;;;
FN:Marie Dupont
TEL;TYPE=CELL:+33 6 12 34 56 78
EMAIL;TYPE=INTERNET:marie@exemple.fr
BDAY:1985-04-12
ADR;TYPE=HOME:;;12 rue des Lilas;Pau;;64000;France
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Sophie
TEL:0698765432
END:VCARD`

test('une vCard donne prénom, nom, téléphone, e-mail', () => {
  const [marie] = lireVCard(VCARD)
  assert.deepEqual(marie, {
    prenom: 'Marie',
    nom: 'Dupont',
    telephone: '+33 6 12 34 56 78',
    email: 'marie@exemple.fr',
  })
})

test('RIEN D’AUTRE N’EST LU : ni anniversaire, ni adresse', () => {
  // Minimisation RGPD appliquée à un import de masse, là où elle est le plus
  // facile à oublier : une donnée sans finalité ne se collecte pas.
  const champs = Object.keys(lireVCard(VCARD)[0])
  assert.deepEqual(champs.sort(), ['email', 'nom', 'prenom', 'telephone'])
})

test('« N » fait autorité sur « FN », qui ne dit pas où est le prénom', () => {
  const carte = lireVCard('BEGIN:VCARD\nFN:Van Der Berg Anne\nN:Van Der Berg;Anne;;;\nEND:VCARD')
  assert.equal(carte[0].prenom, 'Anne')
  assert.equal(carte[0].nom, 'Van Der Berg')
})

test('sans « N », on retombe sur « FN » plutôt que de ne rien importer', () => {
  const [sophie] = lireVCard(VCARD).slice(1)
  assert.equal(sophie.prenom, 'Sophie')
})

test('une ligne vCard pliée se recolle', () => {
  // Le pliage à 75 caractères est dans la norme : sans dépliage, un nom long
  // arrive coupé en deux.
  const carte = lireVCard('BEGIN:VCARD\r\nFN:Marie-Cha\r\n rlotte Dupont\r\nEND:VCARD')
  assert.equal(carte[0].prenom, 'Marie-Charlotte')
})

test('un CSV reconnaît ses colonnes en français comme en anglais', () => {
  const fr = lireCsv('Prénom;Nom;Téléphone;Email\nMarie;Dupont;0612345678;m@x.fr')
  assert.deepEqual(fr, [
    { prenom: 'Marie', nom: 'Dupont', telephone: '0612345678', email: 'm@x.fr' },
  ])
  const en = lireCsv('First Name,Last Name,Phone 1 - Value\nSophie,Martin,0698765432')
  assert.equal(en[0].prenom, 'Sophie')
  assert.equal(en[0].telephone, '0698765432')
})

test('un CSV avec des virgules dans les guillemets se lit correctement', () => {
  const csv = 'Prénom,Nom\n"Marie, dite Mimi",Dupont'
  assert.equal(lireCsv(csv)[0].prenom, 'Marie, dite Mimi')
})

test('sans colonne de prénom, on n’importe RIEN plutôt que du vide', () => {
  assert.deepEqual(lireCsv('Téléphone,Email\n0612345678,m@x.fr'), [])
})

test('LE DOUBLON SE JUGE SUR LE TÉLÉPHONE, jamais sur le nom', () => {
  // Deux « Marie » sont deux clientes ; une Marie enregistrée deux fois sous
  // deux orthographes est une seule personne.
  const resultat = preparerImport(
    [
      { prenom: 'Marie', telephone: '+33612345678' },
      { prenom: 'Marie D.', telephone: '06 12 34 56 78' },
      { prenom: 'Marie', telephone: '0698765432' },
    ],
    [],
  )
  assert.equal(resultat.aCreer.length, 2)
  assert.equal(resultat.doublons, 1)
})

test('un second import ne recrée pas le carnet', () => {
  const resultat = preparerImport([{ prenom: 'Marie', telephone: '0612345678' }], ['0612345678'])
  assert.equal(resultat.aCreer.length, 0)
  assert.equal(resultat.doublons, 1)
})

test('un contact sans téléphone est GARDÉ, et compté à part', () => {
  // La pro connaît ses clientes : une fiche sans numéro reste une fiche. Elle
  // est seulement impossible à dédoublonner, et on le dit.
  const resultat = preparerImport([{ prenom: 'Claire' }], [])
  assert.equal(resultat.aCreer.length, 1)
  assert.equal(resultat.sansTelephone, 1)
  assert.equal(resultat.aCreer[0].telephone, undefined)
})

test('les numéros importés ressortent normalisés', () => {
  const resultat = preparerImport([{ prenom: 'Marie', telephone: '+33 6 12 34 56 78' }], [])
  assert.equal(resultat.aCreer[0].telephone, '0612345678')
})
