import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrestationInput, HoraireInput, ReglagesInput, CommuneInput, RdvInput } from './schemas.ts'

test('une prestation valide se convertit en centimes', () => {
  const r = PrestationInput.parse({
    name: '  Coupe femme ',
    price_cents: '42,50',
    duration_min: '45',
    active: true,
  })
  assert.equal(r.price_cents, 4250)
  assert.equal(r.name, 'Coupe femme')
  assert.equal(r.duration_min, 45)
})

test('un prix mal saisi est refusé avec un message utile', () => {
  const r = PrestationInput.safeParse({ name: 'Coupe', price_cents: 'gratuit', duration_min: '30' })
  assert.equal(r.success, false)
  assert.match(r.error.issues[0].message, /prix/i)
})

test('une durée hors bornes est refusée', () => {
  assert.equal(
    PrestationInput.safeParse({ name: 'X', price_cents: '10', duration_min: '2' }).success,
    false,
  )
  assert.equal(
    PrestationInput.safeParse({ name: 'X', price_cents: '10', duration_min: '900' }).success,
    false,
  )
})

test('un horaire dont la fin précède le début est refusé', () => {
  assert.equal(
    HoraireInput.safeParse({ weekday: 0, starts_at: '09:00', ends_at: '18:00' }).success,
    true,
  )
  const r = HoraireInput.safeParse({ weekday: 0, starts_at: '18:00', ends_at: '09:00' })
  assert.equal(r.success, false)
  assert.match(r.error.issues[0].message, /après le début/)
})

test('un format d’heure invalide est refusé', () => {
  for (const h of ['9:00', '25:00', '09:60', 'midi']) {
    assert.equal(
      HoraireInput.safeParse({ weekday: 0, starts_at: h, ends_at: '18:00' }).success,
      false,
      h,
    )
  }
})

test('le code INSEE corse (2A/2B) est accepté', () => {
  assert.equal(CommuneInput.safeParse({ insee_code: '2A004', name: 'Ajaccio' }).success, true)
  assert.equal(CommuneInput.safeParse({ insee_code: '64445', name: 'Pau' }).success, true)
  assert.equal(CommuneInput.safeParse({ insee_code: '644', name: 'Pau' }).success, false)
})

test('les réglages n’acceptent que les modes de paiement du modèle', () => {
  const base = {
    payment_mode: 'required',
    default_deposit_percent: '30',
    booking_confirmation_mode: 'manual',
    free_cancellation_hours: '48',
    new_client_buffer_min: '15',
    sms_enabled: true,
    gps_app: 'waze',
  }
  const r = ReglagesInput.parse(base)
  assert.equal(r.default_deposit_percent, 30)
  assert.equal(ReglagesInput.safeParse({ ...base, payment_mode: 'gratuit' }).success, false)
  assert.equal(ReglagesInput.safeParse({ ...base, default_deposit_percent: '0' }).success, false)
})

test('les champs facultatifs acceptent la chaîne vide des formulaires HTML', () => {
  // Un formulaire n'envoie jamais null : il envoie "". Sans conversion,
  // `z.uuid().optional()` répondait « Invalid UUID » et bloquait la saisie.
  const r = RdvInput.safeParse({
    client_id: '',
    client_nom: 'Mme Martin',
    client_tel: '',
    service_id: '',
    service_name: 'Coupe',
    price_cents: '48,50',
    debut: '2026-09-15T14:00',
    duration_min: '60',
    address_line1: '',
    postal_code: '',
    city: '',
    access_notes: '',
    note: '',
  })
  assert.ok(r.success, r.success ? '' : r.error.issues[0].message)
  assert.equal(r.data.client_id, null)
  assert.equal(r.data.service_id, null)
  assert.equal(r.data.price_cents, 4850)
})

test('un identifiant réellement invalide reste refusé', () => {
  const r = RdvInput.safeParse({
    client_id: 'pas-un-uuid',
    service_name: 'Coupe',
    price_cents: '10',
    debut: '2026-09-15T14:00',
    duration_min: '60',
  })
  assert.equal(r.success, false)
})

test('il faut une cliente, existante ou nouvelle', () => {
  const base = {
    service_name: 'Coupe',
    price_cents: '10',
    debut: '2026-09-15T14:00',
    duration_min: '60',
  }
  assert.equal(RdvInput.safeParse({ ...base, client_id: '', client_nom: '' }).success, false)
  assert.equal(RdvInput.safeParse({ ...base, client_nom: 'Mme Martin' }).success, true)
  assert.equal(
    RdvInput.safeParse({ ...base, client_id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }).success,
    true,
  )
})
