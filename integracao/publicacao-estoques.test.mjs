import test from 'node:test';
import assert from 'node:assert/strict';
import {publicarEstoqueOficial} from './publicacao-estoques.mjs';
const dados={tipo:'embalado',nome:'estoque.xlsx',versao:'v2',itens:[{sku:'A',lote:'L1',saldo:10}]};
function fake(atual){
 let gravado=null;
 const tx={get:async()=>({exists:()=>!!atual,data:()=>atual}),set:(_ref,v)=>{gravado=v;}};
 return {doc:()=>({}),runTransaction:async(_db,fn)=>fn(tx),gravado:()=>gravado};
}
test('impede publicação sem autorização',async()=>{
 const f=fake(null);
 await assert.rejects(publicarEstoqueOficial({db:{},uid:'u',tipo:'embalado',dados,versaoEsperada:'',...f,autorizado:false}));
 assert.equal(f.gravado(),null);
});
test('impede substituição concorrente',async()=>{
 const f=fake({...dados,versao:'v1'});
 await assert.rejects(publicarEstoqueOficial({db:{},uid:'u',tipo:'embalado',dados,versaoEsperada:'v0',...f,autorizado:true}),/outro operador/);
 assert.equal(f.gravado(),null);
});
test('publica somente quando versão coincide',async()=>{
 const f=fake({...dados,versao:'v1'});
 const r=await publicarEstoqueOficial({db:{},uid:'u',tipo:'embalado',dados,versaoEsperada:'v1',...f,autorizado:true});
 assert.equal(r.versao,'v2');assert.equal(f.gravado().itens[0].saldo,10);
});
test('impede reimportação da mesma versão',async()=>{
 const f=fake(dados);
 await assert.rejects(publicarEstoqueOficial({db:{},uid:'u',tipo:'embalado',dados,versaoEsperada:'v2',...f,autorizado:true}),/já importada/);
});
