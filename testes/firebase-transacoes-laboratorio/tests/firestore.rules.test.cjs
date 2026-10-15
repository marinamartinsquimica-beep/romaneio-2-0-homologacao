'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } = require('firebase/firestore');

const projectId = 'demo-romaneio-firestore-lab';
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'rom_lab_transacoes_paletes/LAB-PALLET-50'), {
      labTag: 'firestore-concurrency-lab-v1', initialBalance: 50, balance: 50
    });
  });
});

test('leitura das coleções do laboratório exige autenticação verificada', async () => {
  const pathRef = doc(testEnv.unauthenticatedContext().firestore(), 'rom_lab_transacoes_paletes/LAB-PALLET-50');
  await assertFails(getDoc(pathRef));
  const signedRef = doc(testEnv.authenticatedContext('tester', { email_verified: true }).firestore(), 'rom_lab_transacoes_paletes/LAB-PALLET-50');
  await assertSucceeds(getDoc(signedRef));
});

test('cliente não pode criar, alterar ou excluir palete, operação ou auditoria', async () => {
  const db = testEnv.authenticatedContext('tester', { email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, 'rom_lab_transacoes_paletes/other'), { balance: 50 }));
  await assertFails(updateDoc(doc(db, 'rom_lab_transacoes_paletes/LAB-PALLET-50'), { balance: 0 }));
  await assertFails(deleteDoc(doc(db, 'rom_lab_transacoes_paletes/LAB-PALLET-50')));
  await assertFails(setDoc(doc(db, 'rom_lab_transacoes_operacoes/fake'), { type: 'debit' }));
  await assertFails(setDoc(doc(db, 'rom_lab_transacoes_auditoria/fake'), { type: 'debit' }));
});

test('nenhuma outra coleção recebe acesso por estas regras', async () => {
  const db = testEnv.authenticatedContext('tester', { email_verified: true }).firestore();
  await assertFails(getDoc(doc(db, 'rom_lab_sync/sample')));
  await assertFails(setDoc(doc(db, 'rom_destinos/production-like'), { name: 'no access' }));
  await assertFails(getDocs(collection(db, 'rom_lab_sync')));
});
