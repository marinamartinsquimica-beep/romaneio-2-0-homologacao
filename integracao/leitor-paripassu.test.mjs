import test from 'node:test';
import assert from 'node:assert/strict';
import {extrairParipassu} from './leitor-paripassu.mjs';
const cab=['Empresa','Código de Rastreamento','Lote','Tipo Produto','Capacidade da Embalagem','Unidade','Quantidade','Qtd. Caixas'];
const linha=(lote,produto,ovos,caixas=1)=>['Raiar','CT',lote,produto,1,'un',ovos,caixas];
test('ignora industrial e calcula caixas pela quantidade de ovos, nunca Qtd. Caixas',()=>{
 const r=extrairParipassu([['Gerado por'],cab,linha('L1','INDUSTRIAL',240),linha('L2','5008-CAIXA (240)-GRANDE BLISTER-20 UNIDADES',2400)]);
 assert.equal(r.industriaisIgnorados,1);assert.equal(r.itens.length,1);assert.equal(r.itens[0].saldo,10);
});
test('reconhece 120 ovos e consolida linhas do mesmo SKU/lote',()=>{
 const r=extrairParipassu([cab,linha('L1','6295-CAIXA (120)-GRANDE TAEQ-10 UNIDADES',120),linha('L1','6295-CAIXA (120)-GRANDE TAEQ-10 UNIDADES',240)]);
 assert.equal(r.itens.length,1);assert.equal(r.itens[0].saldo,3);
});
test('caixas fracionadas permanecem importáveis e sinalizadas',()=>{
 const r=extrairParipassu([cab,linha('L1','5002-CAIXA (240)-MEDIO-10 UNIDADES',1782)]);
 assert.equal(r.itens[0].saldo,7.425);assert.equal(r.caixasFracionadas,1);
});
test('rejeita produto não industrial sem SKU/capacidade',()=>{
 assert.throws(()=>extrairParipassu([cab,linha('L1','PRODUTO DESCONHECIDO',240)]),/sem SKU/);
});
