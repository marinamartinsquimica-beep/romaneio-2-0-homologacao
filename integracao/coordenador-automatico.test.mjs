import assert from 'node:assert/strict';
import {criarCoordenadorAutomatico} from './coordenador-automatico.js';
let fila=1,conectado=false,login=true,envios=0,recebimentos=0,avisos=[];
const c=criarCoordenadorAutomatico({
 sincronizar:async()=>{envios++;fila=0;return {confirmados:1,pendentes:0}},
 receber:async()=>{recebimentos++},
 pendentes:()=>fila,autenticado:()=>login,online:()=>conectado,avisar:x=>avisos.push(x)
});
await c.iniciar();assert.equal(envios,0);assert.equal(fila,1);
conectado=true;await c.reconexao();assert.equal(envios,1);assert.equal(recebimentos,1);
await c.movimentacao();assert.equal(envios,1);assert.equal(recebimentos,2);
login=false;fila=1;await c.movimentacao();assert.equal(fila,1);
c.parar();login=true;await c.reconexao();assert.equal(envios,1);
const falha=criarCoordenadorAutomatico({sincronizar:async()=>{throw Error('sem rede')},receber:async()=>{throw Error('não deveria receber')},pendentes:()=>1,autenticado:()=>true,online:()=>true,avisar:x=>avisos.push(x)});
await falha.iniciar();assert.equal(avisos.at(-1).tipo,'erro');
console.log('Coordenador automático: offline, reconexão, envio, recepção, sessão e falhas OK');
