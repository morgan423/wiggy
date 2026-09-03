import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rythmeDeRetourSemaines, visitesEffectives, depuisQuand } from './fiche.ts'

const le = (iso: string) => ({ debut: new Date(iso) })

test('le rythme ne s’affiche pas avant trois rendez-vous', () => {
  // Avec deux visites on n'a qu'un intervalle, et un intervalle n'est pas un
  // rythme. C'est ce chiffre qui armera la relance : l'inventer serait
  // relancer une cliente sur une régularité qui n'existe pas.
  assert.equal(rythmeDeRetourSemaines([]), null)
  assert.equal(rythmeDeRetourSemaines([le('2026-01-01')]), null)
  assert.equal(rythmeDeRetourSemaines([le('2026-01-01'), le('2026-02-05')]), null)
})

test('cinq semaines régulières donnent cinq semaines', () => {
  const visites = [le('2026-01-01'), le('2026-02-05'), le('2026-03-12'), le('2026-04-16')]
  assert.equal(rythmeDeRetourSemaines(visites), 5)
})

test('une visite exceptionnelle ne déforme pas le rythme', () => {
  // La médiane, et pas la moyenne : six mois d'absence après un déménagement
  // ne transforment pas une habituée des cinq semaines en semestrielle. En
  // moyenne, ces écarts donneraient 12 semaines.
  const visites = [
    le('2026-01-01'),
    le('2026-02-05'),
    le('2026-03-12'),
    le('2026-09-10'),
    le('2026-10-15'),
  ]
  assert.equal(rythmeDeRetourSemaines(visites), 5)
})

test('des rendez-vous rapprochés ne sont pas un rythme', () => {
  // Une mèche à reprendre, un mariage qui se prépare : trois visites en dix
  // jours ne disent pas « revient toutes les semaines ».
  const visites = [le('2026-01-01'), le('2026-01-05'), le('2026-01-10')]
  assert.equal(rythmeDeRetourSemaines(visites), null)
})

test('une visite annulée n’a pas eu lieu, et ne compte nulle part', () => {
  const visites = [
    le('2026-01-01'),
    { debut: new Date('2026-01-20'), annulee: true },
    le('2026-02-05'),
    le('2026-03-12'),
  ]
  assert.equal(visitesEffectives(visites), 3)
  assert.equal(rythmeDeRetourSemaines(visites), 5)
  assert.equal(depuisQuand(visites)?.toISOString(), new Date('2026-01-01').toISOString())
})

test('une cliente qui n’est jamais venue n’a pas de date de première visite', () => {
  assert.equal(depuisQuand([{ debut: new Date('2026-05-01'), annulee: true }]), null)
})
