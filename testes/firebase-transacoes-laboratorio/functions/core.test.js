'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLabService, constants } = require('./core');

class TestHttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function makeFirestore() {
  const documents = new Map();
  let nextId = 0;
  let queue = Promise.resolve();
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const key = (collection, id) => `${collection}/${id}`;
  const db = {
    documents,
    collection(name) {
      return {
        doc(id) {
          const actualId = id || `auto-${++nextId}`;
          return { id: actualId, path: key(name, actualId) };
        }
      };
    },
    runTransaction(callback) {
      const current = queue.then(async () => {
        const writes = new Map();
        const transaction = {
          async get(ref) {
            const value = documents.get(ref.path);
            return { exists: value !== undefined, data: () => clone(value) };
          },
          create(ref, value) {
            writes.set(ref.path, { kind: 'create', value: clone(value) });
          },
          update(ref, value) {
            writes.set(ref.path, { kind: 'update', value: clone(value) });
          }
        };
        const result = await callback(transaction);
        for (const [path, write] of writes) {
          if (write.kind === 'create' && documents.has(path)) throw new TestHttpsError('already-exists', 'exists');
          if (write.kind === 'update' && !documents.has(path)) throw new TestHttpsError('not-found', 'missing');
        }
        for (const [path, write] of writes) {
          if (write.kind === 'create') documents.set(path, write.value);
          else documents.set(path, { ...documents.get(path), ...write.value });
        }
        return result;
      });
      queue = current.catch(() => {});
      return current;
    }
  };
  return db;
}

const user = { uid: 'tester-uid', token: { email_verified: true, firebase: { sign_in_provider: 'password' } } };
const operationId = 'ca2ba0ca-10b0-4a17-97be-a343774e0949';
const move = (overrides = {}) => ({ operationId, palletId: constants.PALLET_ID, quantity: 7, type: 'debit', ...overrides });
function setup(enabled = true) {
  const db = makeFirestore();
  const service = createLabService({ db, FieldValue: { serverTimestamp: () => ({ serverTime: true }) }, HttpsError: TestHttpsError, movementEnabled: enabled });
  return { db, service };
}
const palletPath = `${constants.PALLET_COLLECTION}/${constants.PALLET_ID}`;
const operationPath = id => `${constants.OPERATIONS_COLLECTION}/${id}`;
const auditEvents = db => [...db.documents.entries()].filter(([path]) => path.startsWith(`${constants.AUDIT_COLLECTION}/`)).map(([, value]) => value);

test('seed creates exactly 50 once and never resets an existing balance', async () => {
  const { db, service } = setup();
  assert.deepEqual(await service.initializePallet(user), { created: true, balance: 50 });
  await service.moveBoxes(user, move());
  assert.deepEqual(await service.initializePallet(user), { created: false, balance: 43 });
  assert.equal(db.documents.get(palletPath).balance, 43);
  assert.equal(auditEvents(db).filter(event => event.type === 'seed').length, 1);
});

test('seed refuses malformed pre-existing lab documents without changing them', async () => {
  const { db, service } = setup();
  db.documents.set(palletPath, { labTag: 'unexpected', balance: 9 });
  await assert.rejects(service.initializePallet(user), error => error.code === 'failed-precondition');
  assert.deepEqual(db.documents.get(palletPath), { labTag: 'unexpected', balance: 9 });
  assert.equal(auditEvents(db).length, 0);
});

test('retry with the same UUID and payload is idempotent and audited once', async () => {
  const { db, service } = setup();
  await service.initializePallet(user);
  const first = await service.moveBoxes(user, move());
  const retry = await service.moveBoxes(user, move());
  assert.equal(first.balance, 43);
  assert.equal(first.duplicate, false);
  assert.equal(retry.balance, 43);
  assert.equal(retry.duplicate, true);
  assert.equal(db.documents.get(palletPath).balance, 43);
  assert.ok(db.documents.has(operationPath(operationId)));
  assert.equal(auditEvents(db).filter(event => event.operationId === operationId).length, 1);
});

test('UUID reuse with a different payload is rejected without changing saldo', async () => {
  const { db, service } = setup();
  await service.initializePallet(user);
  await service.moveBoxes(user, move());
  await assert.rejects(service.moveBoxes(user, move({ quantity: 8 })), error => error.code === 'already-exists');
  assert.equal(db.documents.get(palletPath).balance, 43);
});

test('simultaneous withdrawals serialize and cannot produce negative saldo', async () => {
  const { db, service } = setup();
  await service.initializePallet(user);
  const requests = [
    move({ operationId: 'ca2ba0ca-10b0-4a17-97be-a343774e0941', quantity: 30 }),
    move({ operationId: 'ca2ba0ca-10b0-4a17-97be-a343774e0942', quantity: 30 })
  ];
  const results = await Promise.allSettled(requests.map(request => service.moveBoxes(user, request)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'failed-precondition').length, 1);
  assert.equal(db.documents.get(palletPath).balance, 20);
  assert.ok(db.documents.get(palletPath).balance >= 0);
  assert.equal(auditEvents(db).filter(event => event.type === 'debit').length, 1);
});

test('movement stays disabled by default', async () => {
  const { service } = setup(false);
  await service.initializePallet(user);
  await assert.rejects(service.moveBoxes(user, move()), error => error.code === 'failed-precondition');
});

test('rejects unverified users and invalid quantities/UUIDs', async () => {
  const { service } = setup();
  await assert.rejects(service.initializePallet({ uid: 'x', token: { email_verified: false, firebase: { sign_in_provider: 'password' } } }), error => error.code === 'unauthenticated');
  await assert.rejects(service.initializePallet({ uid: 'x', token: { email_verified: true, firebase: { sign_in_provider: 'google.com' } } }), error => error.code === 'unauthenticated');
  await service.initializePallet(user);
  await assert.rejects(service.moveBoxes(user, move({ quantity: 51 })), error => error.code === 'invalid-argument');
  await assert.rejects(service.moveBoxes(user, move({ operationId: 'not-a-uuid' })), error => error.code === 'invalid-argument');
});
