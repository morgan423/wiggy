import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PrestationInput,
  HoraireInput,
  PaiementInput,
  CommuneInput,
  CongeInput,
  ProfilInput,
  RdvInput,
  ReservationInput,
} from './schemas.ts'
import { V } from './messages.ts'

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

test('le paiement n’accepte que les modes du modèle', () => {
  // D17 : l'ancien `ReglagesInput` couvrait sept réglages sans rapport les uns
  // avec les autres. Chaque écran valide désormais ce qu'il montre, et rien
  // d'autre : un formulaire qui envoie des champs qu'il n'affiche pas écrase
  // des valeurs qu'il ne connaît pas.
  const base = {
    payment_mode: 'required',
    default_deposit_percent: '30',
    booking_confirmation_mode: 'manual',
    free_cancellation_hours: '48',
  }
  const r = PaiementInput.parse(base)
  assert.equal(r.default_deposit_percent, 30)
  assert.equal(PaiementInput.safeParse({ ...base, payment_mode: 'gratuit' }).success, false)
  assert.equal(PaiementInput.safeParse({ ...base, default_deposit_percent: '0' }).success, false)
  assert.equal(
    PaiementInput.safeParse({ ...base, booking_confirmation_mode: 'peut-etre' }).success,
    false,
  )
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
    // L'adresse, elle, n'est plus facultative (R2-7 bis) : elle est ici parce
    // qu'un rendez-vous sans lieu ne peut pas exister.
    address_line1: '4 rue Racine',
    postal_code: '64000',
    city: 'Pau',
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
    address_line1: '4 rue Racine',
    postal_code: '64000',
    city: 'Pau',
  }
  assert.equal(RdvInput.safeParse({ ...base, client_id: '', client_nom: '' }).success, false)
  assert.equal(RdvInput.safeParse({ ...base, client_nom: 'Mme Martin' }).success, true)
  assert.equal(
    RdvInput.safeParse({ ...base, client_id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }).success,
    true,
  )
})

/**
 * B3 (recette du 31/08) : aucun message de validation brut ne doit jamais
 * atteindre un humain. Ce test est le filet du filet : il balaie tous les
 * schémas avec des saisies fautives et refuse tout message qui ne serait pas
 * une phrase française du copy deck.
 */
test('zéro vaut « pas d’acompte », comme un champ vide', () => {
  const base = { name: 'Coupe', price_cents: '42', duration_min: '45', active: true }
  for (const saisi of ['0', 0, '', undefined, null]) {
    const r = PrestationInput.safeParse({ ...base, deposit_percent: saisi })
    assert.ok(r.success, `deposit_percent = ${JSON.stringify(saisi)} devrait passer`)
    assert.equal(r.data.deposit_percent, null, JSON.stringify(saisi))
  }
  // Une vraie valeur reste une vraie valeur.
  assert.equal(PrestationInput.parse({ ...base, deposit_percent: '30' }).deposit_percent, 30)
  // Au-delà de 100, le message est écrit, pas traduit à la volée.
  const trop = PrestationInput.safeParse({ ...base, deposit_percent: '140' })
  assert.ok(!trop.success)
  assert.equal(trop.error.issues[0].message, V.acompte)
})

test('aucun message de validation n’échappe au français', () => {
  // Chaque chaîne du deck devient un motif exact : les marques de gabarit
  // ({min}, {max}) sont les seules parties variables autorisées.
  const motifs = Object.entries(V)
    .filter(([cle]) => !cle.startsWith('$'))
    .map(
      ([, texte]) =>
        new RegExp(
          `^${texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[a-z]+\\\}/gi, '.+')}$`,
          'i',
        ),
    )
  const connu = (message: string) => motifs.some((motif) => motif.test(message))

  const fautes: [string, unknown][] = [
    ['PrestationInput', { name: '', price_cents: 'abc', duration_min: 2 }],
    ['PrestationInput', { name: 'x'.repeat(200), price_cents: '10', duration_min: 5000 }],
    ['CommuneInput', { insee_code: 'zzz', name: '', postal_code: '7' }],
    ['HoraireInput', { weekday: 9, starts_at: '25:00', ends_at: 'midi' }],
    ['HoraireInput', { weekday: 1, starts_at: '18:00', ends_at: '09:00' }],
    ['CongeInput', { starts_at: 'pas une date', ends_at: 'pas une date' }],
    ['PaiementInput', { payment_mode: 'gratuit', default_deposit_percent: 500 }],
    ['ProfilInput', { display_name: '', instagram_url: 'pas une url', years_experience: 900 }],
    ['ProfilInput', { display_name: 'Léa', pronoun: 'iel' }],
    ['RdvInput', { service_name: '', price_cents: 'zéro', debut: 'demain', duration_min: 1 }],
    ['ReservationInput', { proId: 'x', serviceId: 'y', debut: '', prenom: '', telephone: '06' }],
    ['ReservationInput', { proId: 'x', serviceId: 'y', prenom: 'Marie', email: 'pas-un-email' }],
  ]
  const schemas: Record<
    string,
    { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }
  > = {
    PrestationInput,
    CommuneInput,
    HoraireInput,
    CongeInput,
    PaiementInput,
    ProfilInput,
    RdvInput,
    ReservationInput,
  }

  const anglais: string[] = []
  for (const [nom, saisie] of fautes) {
    const r = schemas[nom].safeParse(saisie)
    assert.equal(r.success, false, `${nom} aurait dû refuser ${JSON.stringify(saisie)}`)
    for (const issue of r.error?.issues ?? []) {
      if (!connu(issue.message)) anglais.push(`${nom} : « ${issue.message} »`)
    }
  }
  assert.deepEqual(anglais, [], 'ces messages ne viennent pas du copy deck')
})

/**
 * R2-7 bis : un rendez-vous sans lieu n'existe pas dans Wiggy.
 *
 * Le lieu est ce qui fait la tournée, et la tournée est le produit. Sans
 * adresse, un rendez-vous manuel n'a pas de coordonnées, donc pas de trajet :
 * le moteur de créneaux le traverse sans aucune contrainte, et la tournée se
 * calcule en silence sur une journée incomplète. La roadmap promet que les
 * rendez-vous manuels alimentent le moteur géo « exactement comme » ceux pris
 * en ligne : ce test est la condition de vérité de cette phrase.
 */
test('un rendez-vous manuel sans adresse est refusé', () => {
  const base = {
    client_nom: 'Mme Martin',
    service_name: 'Coupe',
    price_cents: '42',
    debut: '2026-09-15T14:00',
    duration_min: '60',
    address_line1: '4 rue Racine',
    postal_code: '64000',
    city: 'Pau',
  }
  assert.ok(RdvInput.safeParse(base).success)

  for (const manquant of ['address_line1', 'postal_code', 'city']) {
    const r = RdvInput.safeParse({ ...base, [manquant]: '' })
    assert.equal(r.success, false, `${manquant} vide devrait être refusé`)
  }

  // Le code postal doit être un vrai code postal : c'est lui qui rattache le
  // rendez-vous à une commune quand l'adresse n'est pas reconnue.
  assert.equal(RdvInput.safeParse({ ...base, postal_code: '640' }).success, false)
  const r = RdvInput.safeParse({ ...base, postal_code: '640' })
  assert.ok(!r.success)
  assert.equal(r.error.issues[0].message, V.proCodePostalRequis)
})
