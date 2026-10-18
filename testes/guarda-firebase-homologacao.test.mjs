import test from 'node:test';
import assert from 'node:assert/strict';
import {exigirFirebaseHomologacao} from '../integracao/guarda-firebase-homologacao.mjs';
test('homologação nunca conecta ao Firebase de produção nem a projeto não configurado',()=>{
 assert.throws(()=>exigirFirebaseHomologacao({projectId:'romaneio-2-0-laboratorio'}),/bloqueada/);
 assert.throws(()=>exigirFirebaseHomologacao({projectId:'outro-projeto-123'}),/bloqueada/);
});
