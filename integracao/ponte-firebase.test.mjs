import assert from 'node:assert/strict';
import {criarPonteConferencia} from './ponte-firebase.js';
let callback,events=[],sent=[],stopped=false,permission=true;
const bridge=criarPonteConferencia({
 observar:(fn)=>{callback=fn;return ()=>{stopped=true}},
 publicar:async d=>{sent.push(d);return true},
 lerLocal:()=>({romaneio:[{sku:'G',lote:'001',caixas:51}]}),
 avisar:e=>events.push(e),
 autorizar:()=>permission
});
bridge.iniciar();
callback({revisao:1,estoque:[{sku:'G',lote:'001',saldo:50}],romaneio:[{sku:'G',lote:'001',caixas:51}]});
assert.equal(events.at(-1).pendencias[0].diferenca,1);
callback({revisao:2,estoque:[{sku:'G',lote:'001',saldo:51}],romaneio:[{sku:'G',lote:'001',caixas:51}]});
assert.equal(events.at(-1).pendencias.length,0);
callback({revisao:1,estoque:[{sku:'G',lote:'001',saldo:50}],romaneio:[{sku:'G',lote:'001',caixas:51}]});
assert.equal(events.at(-1).revisao,2);
await assert.rejects(()=>bridge.publicarConferencia([],false));
assert.equal(sent.length,0);
await bridge.publicarConferencia([{sku:'G',lote:'001',saldo:51}],true);
assert.equal(sent.length,1);
assert.equal(sent[0].baseRevisao,2);
bridge.parar();assert.equal(stopped,true);
permission=false;assert.throws(()=>bridge.iniciar());
console.log('Ponte Firebase: testes de leitura, regularização, conflito, permissão e publicação');
