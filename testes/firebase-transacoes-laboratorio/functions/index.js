'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineBoolean } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { createLabService } = require('./core');

initializeApp();
const db = getFirestore();
const movementsEnabled = defineBoolean('LAB_MOVEMENTS_ENABLED', { default: false });
const rulesValidated = defineBoolean('LAB_RULES_VALIDATED', { default: false });
const lab = createLabService({ db, FieldValue, HttpsError });
const callableOptions = {
  region: 'southamerica-east1',
  maxInstances: 3,
  cors: [
    'https://marinamartinsquimica-beep.github.io',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  enforceAppCheck: true
};

exports.getLabStatus = onCall(callableOptions, request => {
  if (!request.auth?.uid || request.auth.token?.email_verified !== true || request.auth.token?.firebase?.sign_in_provider !== 'password') {
    throw new HttpsError('unauthenticated', 'É necessário entrar com uma conta verificada por e-mail e senha.');
  }
  return {
    movementsEnabled: movementsEnabled.value() && rulesValidated.value(),
    appCheckRequired: true
  };
});

exports.initializeLabPallet = onCall(callableOptions, request =>
  lab.initializePallet(request.auth)
);

exports.moveLabBoxes = onCall(callableOptions, request => {
  const enabled = movementsEnabled.value() && rulesValidated.value();
  return lab.moveBoxes(request.auth, request.data, enabled);
});
