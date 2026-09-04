// Tests de comportement de la base : amorçage d'un compte et, surtout,
// cloisonnement entre comptes (principe non négociable n°3).
//
// Ces tests jouent de vraies requêtes sous les rôles `authenticated` et `anon`
// avec un claim d'identité, comme sur Supabase. Une policy trop permissive
// échoue ici, pas en production.
import { test, before, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, asPro, asAnon, asService, tenter } from './db.mjs'

const ALICE = 'a0000000-0000-4000-8000-000000000001'
const BRUNO = 'b0000000-0000-4000-8000-000000000002'

let db

before(async () => {
  db = await createDb()
  await db.query(
    `insert into auth.users (id, email) values ($1, 'alice@test.fr'), ($2, 'bruno@test.fr')`,
    [ALICE, BRUNO],
  )

  await asPro(db, ALICE, async () => {
    await db.query(
      `insert into pros (id, slug, display_name, city, published) values ($1, 'alice', 'Alice', 'Pau', true)`,
      [ALICE],
    )
    await db.query(
      `insert into clients (pro_id, first_name, phone, technical_notes)
       values ($1, 'Mme Martin', '0600000000', 'Couleur 7.3 + 20 vol, pose 35 min')`,
      [ALICE],
    )
  })

  await asPro(db, BRUNO, async () => {
    await db.query(
      `insert into pros (id, slug, display_name, city, published) values ($1, 'bruno', 'Bruno', 'Tarbes', false)`,
      [BRUNO],
    )
  })
})

describe('amorçage du compte pro', () => {
  test('les réglages et l’abonnement sont créés avec le compte', async () => {
    const { rows: reglages } = await db.query('select * from pro_settings where pro_id = $1', [
      ALICE,
    ])
    assert.equal(reglages.length, 1)
    // S1 : par défaut, pas de paiement en ligne → « vous ne payez qu'après ».
    assert.equal(reglages[0].payment_mode, 'off')
    // A11 : confirmation automatique par défaut, le pro peut basculer.
    assert.equal(reglages[0].booking_confirmation_mode, 'auto')

    const { rows: abo } = await db.query('select * from subscriptions where pro_id = $1', [ALICE])
    assert.equal(abo.length, 1)
    assert.equal(abo[0].status, 'trialing')
    assert.equal(abo[0].tier, 'tier_2', 'l’essai se fait sur l’offre héros')
    assert.ok(abo[0].trial_ends_at, 'l’essai doit avoir une échéance')
  })
})

describe('cloisonnement entre comptes pros', () => {
  test('un pro ne voit pas les clientes d’un autre', async () => {
    const vues = await asPro(db, BRUNO, async () => {
      const { rows } = await db.query('select * from clients')
      return rows
    })
    assert.equal(vues.length, 0, 'Bruno ne doit voir aucune cliente d’Alice')

    const propres = await asPro(db, ALICE, async () => {
      const { rows } = await db.query('select * from clients')
      return rows
    })
    assert.equal(propres.length, 1, 'Alice doit voir sa cliente')
  })

  test('un pro ne peut ni modifier ni supprimer la cliente d’un autre', async () => {
    await asPro(db, BRUNO, async () => {
      const maj = await db.query(`update clients set first_name = 'Piraté' returning id`)
      assert.equal(maj.rows.length, 0)
      const suppr = await db.query(`delete from clients returning id`)
      assert.equal(suppr.rows.length, 0)
    })

    const { rows } = await db.query('select first_name from clients')
    assert.equal(rows[0].first_name, 'Mme Martin', 'la donnée d’Alice est intacte')
  })

  test('un pro ne peut pas créer une donnée au nom d’un autre', async () => {
    await asPro(db, BRUNO, async () => {
      await assert.rejects(
        db.query(`insert into clients (pro_id, first_name) values ($1, 'Fausse')`, [ALICE]),
        /row-level security/i,
      )
    })
  })

  test('un pro ne peut pas s’attribuer un palier supérieur', async () => {
    // Palier et statut ne bougent que par webhook Stripe (service role).
    await asPro(db, ALICE, async () => {
      const { rows } = await db.query(`update subscriptions set tier = 'tier_3' returning pro_id`)
      assert.equal(rows.length, 0, 'aucune ligne ne doit être modifiable par le pro')
    })
    const { rows } = await db.query('select tier from subscriptions where pro_id = $1', [ALICE])
    assert.equal(rows[0].tier, 'tier_2')
  })
})

describe('page publique (visiteuse anonyme)', () => {
  test('seules les fiches publiées sont visibles', async () => {
    const rows = await asAnon(db, async () => {
      const { rows } = await db.query('select slug from pros')
      return rows
    })
    assert.deepEqual(
      rows.map((r) => r.slug),
      ['alice'],
      'la fiche non publiée de Bruno reste invisible',
    )
  })

  test('le téléphone du pro n’est pas exposé', async () => {
    await asAnon(db, async () => {
      await assert.rejects(db.query('select phone from pros'), /permission denied/i)
    })
  })

  test('aucun accès aux clientes ni aux rendez-vous', async () => {
    await asAnon(db, async () => {
      for (const table of ['clients', 'appointments', 'subscriptions']) {
        const { rows } = await db.query(`select * from ${table}`).catch(() => ({ rows: [] }))
        assert.equal(rows.length, 0, table)
      }
    })
  })
})

describe('liste d’attente A9 — verrouillée par conception', () => {
  // Ces tests figent une décision d'architecture : `city_waitlist` n'est
  // écrivable QUE par la route serveur en service_role. Si quelqu'un ajoute
  // une politique anon en croyant réparer un oubli, ils échouent.

  test('une visiteuse ne peut RIEN faire sur la table', async () => {
    await asAnon(db, async () => {
      const cas = [
        [
          'dépôt',
          `insert into city_waitlist (email, city_key, city_name)
                   values ('claire@exemple.fr', 'insee:64445', 'Pau')`,
        ],
        ['lecture', 'select * from city_waitlist'],
        ['modification', `update city_waitlist set email = 'pirate@x.fr'`],
        ['suppression', 'delete from city_waitlist'],
      ]
      for (const [libelle, sql] of cas) {
        const r = await tenter(db, sql)
        assert.equal(r.ok, false, `${libelle} devrait être refusé`)
        assert.match(r.message, /permission denied|row-level security/i, libelle)
      }
    })
  })

  test('un pro authentifié n’y a pas accès non plus', async () => {
    // La liste d'attente est une donnée de plateforme, pas une donnée de pro :
    // aucun compte ne doit pouvoir lire les adresses des visiteuses.
    await asPro(db, ALICE, async () => {
      const r = await tenter(db, 'select * from city_waitlist')
      assert.equal(r.rows?.length ?? 0, 0, 'aucune ligne ne doit remonter')
    })
  })

  test('le plafond par adresse s’applique même en service_role', async () => {
    // Le déclencheur ne dépend pas de la RLS : il protège aussi le chemin
    // serveur, seul chemin d'écriture existant.
    await asService(db, async () => {
      for (let i = 0; i < 5; i++) {
        const r = await tenter(
          db,
          `insert into city_waitlist (email, city_key, city_name) values ('plafond@exemple.fr', $1, 'Ville')`,
          [`insee:6420${i}`],
        )
        assert.ok(r.ok, `dépôt ${i} : ${r.message}`)
      }
      const stop = await tenter(
        db,
        `insert into city_waitlist (email, city_key, city_name) values ('plafond@exemple.fr', 'insee:64299', 'Ville')`,
      )
      assert.equal(stop.ok, false)
      assert.match(stop.message, /Trop de demandes/i)
    })
  })

  test('un doublon exact ne crée pas de seconde ligne', async () => {
    await asService(db, async () => {
      const depot = `insert into city_waitlist (email, city_key, city_name)
                     values ('doublon@exemple.fr', 'insee:33063', 'Bordeaux')`
      assert.ok((await tenter(db, depot)).ok, 'le premier dépôt doit passer')
      const second = await tenter(db, depot)
      assert.equal(second.ok, false)
      assert.match(second.message, /duplicate key|unique/i)
    })
  })
})

describe('quotas applicatifs', () => {
  test('consommer_quota autorise puis refuse au-delà de la limite', async () => {
    const appel = async () => {
      const { rows } = await db.query(`select consommer_quota('test:ip', 2, 600) as ok`)
      return rows[0].ok
    }
    assert.equal(await appel(), true)
    assert.equal(await appel(), true)
    assert.equal(await appel(), false, 'le troisième appel dépasse la limite de 2')
  })

  test('la fonction n’est pas exécutable par anon ni par un pro', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec('begin')
      await db.exec(`set local role ${role}`)
      const r = await tenter(db, `select consommer_quota('x', 1, 60)`)
      await db.exec('rollback')
      assert.equal(r.ok, false, role)
      assert.match(r.message, /permission denied/i, role)
    }
  })
})

describe('A5 / A6 — hors zone et séjour', () => {
  test('le domicile du pro n’est pas lisible par une visiteuse', async () => {
    // Principe : les coordonnées précises du domicile d'une pro ne sont jamais
    // exposées publiquement. En mode « rayon », le centre de la zone EST son
    // domicile. La clé anonyme étant publique, ces deux colonnes reviendraient
    // à publier son adresse.
    await asPro(db, ALICE, async () => {
      await db.query(
        `insert into service_areas (pro_id, mode, center_lat, center_lng, radius_km)
         values ($1, 'radius', 43.2951, -0.3708, 15)`,
        [ALICE],
      )
    })
    await asAnon(db, async () => {
      const r = await tenter(db, 'select center_lat, center_lng from service_areas')
      assert.equal(r.ok, false, 'le centre de zone ne doit pas être lisible')
      assert.match(r.message, /permission denied/i)
      // Le mode, lui, reste public : la page en a besoin.
      const mode = await tenter(db, 'select pro_id, mode from service_areas')
      assert.equal(mode.ok, true)
    })
  })

  test('des dates de séjour incohérentes sont refusées', async () => {
    await asPro(db, ALICE, async () => {
      const r = await tenter(
        db,
        `insert into appointments
           (pro_id, service_name, price_cents, starts_at, ends_at, stay_from, stay_to)
         values ($1, 'Coupe', 4200, now(), now() + interval '1 hour', '2026-08-20', '2026-08-10')`,
        [ALICE],
      )
      assert.equal(r.ok, false, 'un séjour qui finit avant de commencer n’a pas de sens')
      assert.match(r.message, /stay_coherent/i)
    })
  })

  test('le jeton de suivi ne donne accès à rien pour une visiteuse', async () => {
    // La page de suivi passe par le service role : le jeton n'ouvre aucune
    // porte côté PostgREST, sans quoi il suffirait de le deviner.
    let jeton
    await asPro(db, ALICE, async () => {
      const { rows } = await db.query(
        `insert into appointments
           (pro_id, service_name, price_cents, starts_at, ends_at, status, out_of_zone)
         values ($1, 'Couleur', 7500, now() + interval '2 days',
                 now() + interval '2 days 1 hour', 'conditional', true)
         returning public_token`,
        [ALICE],
      )
      jeton = rows[0].public_token
      assert.ok(jeton, 'chaque rendez-vous porte un jeton')
    })
    await asAnon(db, async () => {
      const { rows } = await db
        .query('select id from appointments where public_token = $1', [jeton])
        .catch(() => ({ rows: [] }))
      assert.equal(rows.length, 0, 'le jeton seul ne donne aucun accès')
    })
  })
})

describe('A4 — photos de la réservation', () => {
  test('le seau des photos est privé', async () => {
    const { rows } = await db.query(
      `select public, file_size_limit from storage.buckets where id = 'appointment-photos'`,
    )
    assert.equal(rows.length, 1, 'le seau doit être déclaré par une migration')
    assert.equal(rows[0].public, false, 'ce sont des photos de personnes')
  })

  test('un pro ne voit pas les photos d’un autre pro', async () => {
    let rdvAlice
    await asPro(db, ALICE, async () => {
      const { rows } = await db.query(
        `insert into appointments (pro_id, service_name, price_cents, starts_at, ends_at)
         values ($1, 'Coupe', 4200, now() + interval '3 days',
                 now() + interval '3 days 1 hour') returning id`,
        [ALICE],
      )
      rdvAlice = rows[0].id
      await db.query(
        `insert into appointment_photos (appointment_id, storage_path, kind)
         values ($1, 'alice/rdv/0.jpg', 'inspiration')`,
        [rdvAlice],
      )
    })

    await asPro(db, BRUNO, async () => {
      const { rows } = await db.query('select * from appointment_photos')
      assert.equal(rows.length, 0, 'les photos suivent le cloisonnement du rendez-vous')
      // Et il ne peut pas non plus en accrocher une au rendez-vous d'Alice.
      const r = await tenter(
        db,
        `insert into appointment_photos (appointment_id, storage_path)
         values ($1, 'bruno/vol.jpg')`,
        [rdvAlice],
      )
      assert.equal(r.ok, false, 'aucune écriture sur le rendez-vous d’un autre')
    })

    await asPro(db, ALICE, async () => {
      const { rows } = await db.query('select * from appointment_photos')
      assert.equal(rows.length, 1, 'Alice voit bien les siennes')
    })
  })

  test('aucune photo n’est lisible par une visiteuse', async () => {
    await asAnon(db, async () => {
      const { rows } = await db
        .query('select * from appointment_photos')
        .catch(() => ({ rows: [] }))
      assert.equal(rows.length, 0)
    })
  })
})

describe('D9 / A8 — authentification et forfait de déplacement', () => {
  test('le forfait de déplacement n’est plus lisible par une visiteuse', async () => {
    // A8 : le montant ne sort JAMAIS côté cliente. Un « +10 € » public
    // ancrerait la pro trop bas quand le trajet est long ; elle découvre le
    // montant dans sa proposition, et la cliente le confirme.
    await asPro(db, ALICE, async () => {
      await db.query(
        `insert into distance_fees (pro_id, from_km, fee_cents) values ($1, 0, 1000)`,
        [ALICE],
      )
    })
    await asAnon(db, async () => {
      const r = await tenter(db, 'select fee_cents from distance_fees')
      assert.equal(r.ok, false, 'le montant du forfait ne doit pas être lisible')
      assert.match(r.message, /permission denied/i)
    })
    // Le pro, lui, lit et modifie le sien.
    await asPro(db, ALICE, async () => {
      const { rows } = await db.query('select fee_cents from distance_fees')
      assert.equal(rows[0].fee_cents, 1000)
    })
  })

  test('la table des codes est verrouillée par conception', async () => {
    // Même principe que `city_waitlist` : RLS active, aucune politique. Les
    // codes ne s'écrivent et ne se lisent que par la route serveur, qui porte
    // les plafonds anti-pompage. Ajouter une politique les contournerait.
    for (const [role, jouer] of [
      ['visiteuse', (f) => asAnon(db, f)],
      ['pro', (f) => asPro(db, ALICE, f)],
    ]) {
      await jouer(async () => {
        const lecture = await tenter(db, 'select * from phone_verifications')
        assert.equal(lecture.rows?.length ?? 0, 0, `${role} ne doit rien lire`)
        const ecriture = await tenter(
          db,
          `insert into phone_verifications (phone, code_hash, expires_at)
           values ('0600000000', 'x', now() + interval '10 minutes')`,
        )
        assert.equal(ecriture.ok, false, `${role} ne doit rien écrire`)
      })
    }
  })

  test('un numéro vérifié se retient, des deux côtés', async () => {
    // D9 : vérifier à chaque réservation ajouterait un SMS par rendez-vous,
    // soit 43 % de plus sur le poste variable dominant. La mémoire du numéro
    // est ce qui rend la décision tenable, et elle existe dès maintenant même
    // si l'écran cliente arrive en livraison 2.
    await asPro(db, ALICE, async () => {
      await db.query(`update pros set phone_verified_at = now() where id = $1`, [ALICE])
      const { rows: fiche } = await db.query(
        `insert into clients (pro_id, first_name, phone, phone_verified_at)
         values ($1, 'Marie', '0611223344', now()) returning phone_verified_at`,
        [ALICE],
      )
      assert.ok(fiche[0].phone_verified_at, 'la fiche cliente retient sa vérification')
    })
  })
})

describe('G7 — l’acceptation contractuelle tracée', () => {
  test('L’HORODATAGE EST CELUI DU SERVEUR, même quand le client en envoie un', async () => {
    // La règle la plus importante de G7, et la seule qui ne peut PAS reposer
    // sur la discipline du code applicatif : un `default now()` se contourne
    // en envoyant la colonne. Le déclencheur, lui, écrase.
    await asService(db, async () => {
      const { rows } = await db.query(
        `insert into acceptances (point, user_id, doc_slug, doc_version, accepted_at)
         values ('inscription_pro', $1, 'cgv', '0.1-beta', timestamptz '1999-01-01 00:00:00+00')
         returning accepted_at`,
        [ALICE],
      )
      const ecrit = new Date(rows[0].accepted_at).getFullYear()
      assert.notEqual(ecrit, 1999, 'l’horloge du client ne doit JAMAIS dater une preuve')
      assert.ok(Math.abs(Date.now() - new Date(rows[0].accepted_at)) < 60_000)
    })
  })

  test('UNE ACCEPTATION PART AVEC LE COMPTE : le droit à l’effacement prime', async () => {
    /*
      Constaté par le test de bout en bout : le déclencheur d'immuabilité
      refusait aussi les suppressions en CASCADE, donc un compte pro ne pouvait
      plus être supprimé du tout. On ne garde pas la preuve d'un accord donné
      par quelqu'un qu'on a l'obligation d'effacer (G5, RGPD).
    */
    await asService(db, async () => {
      const jetable = 'c0000000-0000-4000-8000-000000000003'
      await db.query(`insert into auth.users (id, email) values ($1, 'jetable@test.fr')`, [jetable])
      await db.query(
        `insert into acceptances (point, user_id, doc_slug, doc_version)
         values ('inscription_pro', $1, 'cgv', '0.1-beta')`,
        [jetable],
      )
      const r = await tenter(db, `delete from auth.users where id = $1`, [jetable])
      assert.equal(r.ok, true, 'la suppression du compte doit passer')
      const { rows } = await db.query(`select * from acceptances where user_id = $1`, [jetable])
      assert.equal(rows.length, 0, 'et emporter la preuve avec elle')
    })
  })

  test('une preuve ne se modifie ni ne s’efface SEULE, MÊME par le serveur', async () => {
    // Éprouvé au rôle serveur, celui qui contourne la RLS et par lequel nous
    // écrivons réellement. Si c'était la RLS qui tenait la règle, ce test
    // passerait ici en ne protégeant rien là où ça compte.
    await asService(db, async () => {
      const modif = await tenter(
        db,
        `update acceptances set doc_version = '9.9' where user_id = $1`,
        [ALICE],
      )
      assert.equal(modif.ok, false, 'une acceptation ne se corrige pas')
      assert.match(modif.message, /preuve/i)
      const suppr = await tenter(db, `delete from acceptances where user_id = $1`, [ALICE])
      assert.equal(suppr.ok, false, 'une acceptation ne s’efface pas')
    })
  })

  test('une version acceptée ne peut plus être supprimée du registre', async () => {
    // Sans cette clé étrangère, effacer une version rendrait illisible ce qui
    // a été accepté : la preuve ne prouverait plus rien.
    await asService(db, async () => {
      const r = await tenter(
        db,
        `delete from legal_documents where slug = 'cgv' and version = '0.1-beta'`,
      )
      assert.equal(r.ok, false)
    })
  })

  test('une pro relit ses acceptations, jamais celles d’une autre', async () => {
    await asPro(db, ALICE, async () => {
      const { rows } = await db.query('select * from acceptances')
      assert.ok(rows.length >= 1, 'Alice voit les siennes')
    })
    await asPro(db, BRUNO, async () => {
      const { rows } = await db.query('select * from acceptances')
      assert.equal(rows.length, 0, 'Bruno ne voit rien d’Alice')
    })
  })

  test('les textes sont lisibles SANS COMPTE : on lit avant d’accepter', async () => {
    await asAnon(db, async () => {
      const { rows } = await db.query(`select slug from legal_documents where slug = 'cgu'`)
      assert.equal(rows.length, 1)
    })
  })

  test('une visiteuse ne peut ni écrire une preuve ni réécrire un texte', async () => {
    await asAnon(db, async () => {
      const preuve = await tenter(
        db,
        `insert into acceptances (point, client_id, doc_slug, doc_version)
         values ('reservation_cliente', gen_random_uuid(), 'cgu', '0.1-beta')`,
      )
      assert.equal(preuve.ok, false)
      const texte = await tenter(
        db,
        `update legal_documents set corps = 'ce que je veux' where slug = 'cgv'`,
      )
      assert.equal(texte.ok, false)
    })
  })

  test('une acceptation vise un pro OU une cliente, jamais les deux ni aucun', async () => {
    await asService(db, async () => {
      const deux = await tenter(
        db,
        `insert into acceptances (point, user_id, client_id, doc_slug, doc_version)
         values ('inscription_pro', $1, gen_random_uuid(), 'cgv', '0.1-beta')`,
        [ALICE],
      )
      assert.equal(deux.ok, false)
      const aucun = await tenter(
        db,
        `insert into acceptances (point, doc_slug, doc_version)
         values ('inscription_pro', 'cgv', '0.1-beta')`,
      )
      assert.equal(aucun.ok, false)
    })
  })
})

describe('E3 — la télémétrie, verrouillée par conception', () => {
  test('une visiteuse ne peut RIEN faire sur la table', async () => {
    // Même principe que `city_waitlist` : RLS active, aucune politique. Une
    // mesure qu'on peut fabriquer depuis un navigateur ne mesure plus rien, et
    // celle-ci sert à régler les pondérations de A12.
    await asAnon(db, async () => {
      const lecture = await tenter(db, 'select * from evenements')
      assert.equal(lecture.rows?.length ?? 0, 0)
      const ecriture = await tenter(
        db,
        `insert into evenements (kind, session, details)
         values ('creneau_choisi', 'faux', '{"rang": 1}'::jsonb)`,
      )
      assert.equal(ecriture.ok, false, 'une visiteuse ne doit rien écrire')
    })
  })

  test('un pro ne lit pas la télémétrie, pas même la sienne', async () => {
    // Elle sert au réglage du produit, pas au produit. Rien dans l'app pro ne
    // la lit, donc rien n'a besoin d'y accéder avec les droits d'un pro.
    await asPro(db, ALICE, async () => {
      const r = await tenter(db, 'select * from evenements')
      assert.equal(r.rows?.length ?? 0, 0)
    })
  })

  test('UN ÉVÉNEMENT VISE UN PRO OU UNE SESSION, jamais les deux', async () => {
    // Les mélanger rendrait une visite anonyme rattachable à un compte, ce qui
    // est exactement ce que le cadrage RGPD interdit.
    await asService(db, async () => {
      const deux = await tenter(
        db,
        `insert into evenements (kind, pro_id, session) values ('usage_app', $1, 'sess')`,
        [ALICE],
      )
      assert.equal(deux.ok, false)
      const aucun = await tenter(db, `insert into evenements (kind) values ('usage_app')`)
      assert.equal(aucun.ok, false)
    })
  })

  test('la purge à douze mois efface le vieux et garde le récent', async () => {
    await asService(db, async () => {
      await db.query(
        `insert into evenements (kind, pro_id, created_at)
         values ('usage_app', $1, now() - interval '13 months'),
                ('usage_app', $1, now() - interval '1 month')`,
        [ALICE],
      )
      const { rows } = await db.query('select purger_evenements() as n')
      assert.equal(rows[0].n, 1, 'seul l’événement de treize mois part')
      const { rows: reste } = await db.query('select count(*)::int as n from evenements')
      assert.ok(reste[0].n >= 1, 'le récent est toujours là')
    })
  })

  test('la synthèse hebdomadaire agrège, et ne donne pas l’événement isolé', async () => {
    // À cinq testeuses, ces données éclairent des comportements individuels,
    // elles ne prouvent aucune tendance. La vue ne donne d'ailleurs pas les
    // moyens de descendre à l'événement.
    await asService(db, async () => {
      const { rows } = await db.query('select * from synthese_hebdo')
      assert.ok(rows.every((r) => 'semaine' in r && 'volume' in r))
      assert.equal(
        rows.some((r) => 'details' in r || 'id' in r),
        false,
        'la vue ne doit exposer ni le détail ni l’identifiant d’un événement',
      )
    })
  })
})
