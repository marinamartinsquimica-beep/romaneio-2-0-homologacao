import test from 'node:test';
import assert from 'node:assert/strict';
import {validarEstoqueOficial,podeSubstituirVersao} from './contrato-estoques.mjs';
const base={tipo:'embalado',nome:'estoque.xlsx',versao:'v1',itens:[{sku:'A',lote:'L1',saldo:10,postura:'2026-10-17'}]};
test('aceita estoque valido sem mutar entrada',()=>{
 const x=validarEstoqueOficial(base,'embalado');
 assert.equal(x.itens[0].saldo,10);assert.equal(base.itens[0].saldo,10);
});
test('rejeita tipo trocado',()=>assert.throws(()=>validarEstoqueOficial(base,'paripassu')));
test('rejeita saldo vazio, negativo ou texto',()=>{
 for(const saldo of ['',null,-1,'abc'])assert.throws(()=>validarEstoqueOficial({...base,itens:[{...base.itens[0],saldo}]},'embalado'));
});
test('rejeita duplicata sem distinguir caixa',()=>{
 assert.throws(()=>validarEstoqueOficial({...base,itens:[base.itens[0],{sku:'a',lote:'l1',saldo:3}]},'embalado'));
});
test('rejeita arquivo vazio e versão repetida',()=>{
 assert.throws(()=>validarEstoqueOficial({...base,itens:[]},'embalado'));
 assert.throws(()=>podeSubstituirVersao(base,base));
});
test('permite nova versão do mesmo tipo',()=>{
 assert.equal(podeSubstituirVersao(base,{...base,versao:'v2'}),true);
});

test('permite caixas fracionadas no PariPassu como pendencia',()=>{
 const x=validarEstoqueOficial({tipo:'paripassu',nome:'paripassu.xlsx',versao:'v2',itens:[{sku:'5008',lote:'L1',saldo:1.5,ovos:360,ovosPorCaixa:240}]},'paripassu');
 assert.equal(x.itens[0].saldo,1.5);
});
