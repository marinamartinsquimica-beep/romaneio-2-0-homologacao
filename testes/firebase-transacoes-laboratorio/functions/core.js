'use strict';

const PALLET_COLLECTION = 'rom_lab_transacoes_paletes';
const OPERATIONS_COLLECTION = 'rom_lab_transacoes_operacoes';
const AUDIT_COLLECTION = 'rom_lab_transacoes_auditoria';
const PALLET_ID = 'LAB-PALLET-50';
const LAB_TAG = 'firestore-concurrency-lab-v1';
const INITIAL_BALANCE = 50;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createLabService({ db, FieldValue, HttpsError, movementEnabled = false }) {
  if (!db || !FieldValue || typeof HttpsError !== 'function') {
    throw new TypeError('Firestore, FieldValue e HttpsError são obrigatórios.');
  }
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const requireVerifiedUser = auth => {
    if (!auth?.uid || auth.token?.email_verified !== true || auth.token?.firebase?.sign_in_provider !== 'password') {
      fail('unauthenticated', 'É necessário entrar com uma conta verificada por e-mail e senha.');
    }
    return auth.uid;
  };

  async function initializePallet(auth) {
    const uid = requireVerifiedUser(auth);
    const palletRef = db.collection(PALLET_COLLECTION).doc(PALLET_ID);
    const auditRef = db.collection(AUDIT_COLLECTION).doc();
    return db.runTransaction(async transaction => {
      const snapshot = await transaction.get(palletRef);
      if (snapshot.exists) {
        const current = snapshot.data();
        if (current.labTag !== LAB_TAG || current.initialBalance !== INITIAL_BALANCE ||
            !Number.isInteger(current.balance) || current.balance < 0 || current.balance > INITIAL_BALANCE) {
          fail('failed-precondition', 'O documento de laboratório existente não corresponde ao esquema esperado; nenhum dado foi sobrescrito.');
        }
        return { created: false, balance: current.balance };
      }
      const now = FieldValue.serverTimestamp();
      transaction.create(palletRef, {
        labTag: LAB_TAG,
        palletId: PALLET_ID,
        initialBalance: INITIAL_BALANCE,
        balance: INITIAL_BALANCE,
        createdBy: uid,
        createdAt: now,
        updatedAt: now
      });
      transaction.create(auditRef, {
        labTag: LAB_TAG,
        type: 'seed',
        palletId: PALLET_ID,
        quantity: INITIAL_BALANCE,
        balanceBefore: null,
        balanceAfter: INITIAL_BALANCE,
        actorUid: uid,
        createdAt: now
      });
      return { created: true, balance: INITIAL_BALANCE };
    });
  }

  async function moveBoxes(auth, data, enabled = movementEnabled) {
    const uid = requireVerifiedUser(auth);
    if (enabled !== true) fail('failed-precondition', 'Movimentações estão desabilitadas até a validação do laboratório.');
    if (!data || data.palletId !== PALLET_ID || data.type !== 'debit' ||
        !Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > INITIAL_BALANCE ||
        typeof data.operationId !== 'string' || !UUID_V4.test(data.operationId)) {
      fail('invalid-argument', 'A operação deve conter UUID v4, palete de laboratório fixo e quantidade inteira entre 1 e 50.');
    }

    const palletRef = db.collection(PALLET_COLLECTION).doc(PALLET_ID);
    const operationRef = db.collection(OPERATIONS_COLLECTION).doc(data.operationId);
    const auditRef = db.collection(AUDIT_COLLECTION).doc();
    return db.runTransaction(async transaction => {
      const [operationSnapshot, palletSnapshot] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(palletRef)
      ]);

      if (operationSnapshot.exists) {
        const previous = operationSnapshot.data();
        if (previous.actorUid !== uid || previous.palletId !== PALLET_ID ||
            previous.type !== 'debit' || previous.quantity !== data.quantity) {
          fail('already-exists', 'Este UUID já foi usado por uma operação diferente.');
        }
        return { duplicate: true, operationId: data.operationId, balance: previous.balanceAfter };
      }

      if (!palletSnapshot.exists) fail('failed-precondition', 'Crie o palete fictício antes de movimentar.');
      const pallet = palletSnapshot.data();
      if (pallet.labTag !== LAB_TAG || pallet.initialBalance !== INITIAL_BALANCE ||
          !Number.isInteger(pallet.balance) || pallet.balance < 0 || pallet.balance > INITIAL_BALANCE) {
        fail('failed-precondition', 'Estado do palete inválido; operação recusada sem gravação.');
      }
      if (pallet.balance < data.quantity) fail('failed-precondition', 'Saldo insuficiente; operação recusada sem gravação.');

      const balanceAfter = pallet.balance - data.quantity;
      const now = FieldValue.serverTimestamp();
      const operation = {
        labTag: LAB_TAG,
        operationId: data.operationId,
        palletId: PALLET_ID,
        type: 'debit',
        quantity: data.quantity,
        balanceBefore: pallet.balance,
        balanceAfter,
        actorUid: uid,
        createdAt: now
      };
      transaction.update(palletRef, { balance: balanceAfter, updatedAt: now });
      transaction.create(operationRef, operation);
      transaction.create(auditRef, operation);
      return { duplicate: false, operationId: data.operationId, balance: balanceAfter };
    });
  }

  return { initializePallet, moveBoxes };
}

module.exports = {
  createLabService,
  constants: { PALLET_COLLECTION, OPERATIONS_COLLECTION, AUDIT_COLLECTION, PALLET_ID, LAB_TAG, INITIAL_BALANCE }
};
