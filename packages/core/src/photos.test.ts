import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validerPhotos, extensionPhoto, PHOTOS_MAX, PHOTO_TAILLE_MAX } from './photos.ts'

const photo = (size = 1000, type = 'image/jpeg') => ({ size, type })

test('un lot ordinaire passe', () => {
  const resultat = validerPhotos([photo(), photo(2000, 'image/png')])
  assert.ok(resultat.ok)
  assert.equal(resultat.retenues.length, 2)
})

test('un champ de fichier vide n’est pas une erreur', () => {
  // Un `input[type=file]` non rempli envoie un fichier de zéro octet. Le
  // signaler à la cliente serait lui reprocher de ne pas avoir mis de photo.
  const resultat = validerPhotos([photo(0, 'application/octet-stream'), photo()])
  assert.ok(resultat.ok)
  assert.equal(resultat.retenues.length, 1)
})

test('au-delà du plafond, on refuse le lot entier', () => {
  const trop = Array.from({ length: PHOTOS_MAX + 1 }, () => photo())
  assert.deepEqual(validerPhotos(trop), { ok: false, raison: 'trop-nombreuses' })
})

test('un PDF déguisé en photo est refusé', () => {
  assert.deepEqual(validerPhotos([photo(1000, 'application/pdf')]), {
    ok: false,
    raison: 'format',
  })
})

test('une photo trop lourde est refusée', () => {
  assert.deepEqual(validerPhotos([photo(PHOTO_TAILLE_MAX + 1)]), {
    ok: false,
    raison: 'trop-lourde',
  })
  // Pile à la limite, elle passe.
  assert.equal(validerPhotos([photo(PHOTO_TAILLE_MAX)]).ok, true)
})

test('le HEIC de l’iPhone est accepté', () => {
  assert.equal(validerPhotos([photo(1000, 'image/heic')]).ok, true)
  assert.equal(extensionPhoto('image/heic'), 'heic')
  assert.equal(extensionPhoto('image/jpeg'), 'jpg')
  // Un type inconnu ne devient jamais une extension exotique.
  assert.equal(extensionPhoto('image/inconnu'), 'jpg')
})
