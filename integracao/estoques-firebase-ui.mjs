import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {publicarEstoqueOficial} from './publicacao-estoques.mjs';
import {conferirEstoques} from './conferencia-estoques.mjs';
const config={apiKey:'AIzaSyAtlG-oys01gqgCdiANbzuzx9Mh9SiMRQo',authDomain:'romaneio-2-0-laboratorio.firebaseapp.com',projectId:'romaneio-2-0-laboratorio',storageBucket:'romaneio-2-0-laboratorio.firebasestorage.app',messagingSenderId:'343680211941',appId:'1:343680211941:web:8ad689db2c09447c2ded0c'};
const app=getApps().length?getApp():initializeApp(config),auth=getAuth(app),db=getFirestore(app);
let unsub=[],versoes={embalado:'',paripassu:''};
const $=id=>document.getElementById(id),mostrar=(s)=>{const el=$('etapa4FirebaseStatus');if(el)el.textContent=s};
const N=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function lerEmbalado(linhas){
 const i=linhas.findIndex(l=>l.some(x=>N(x)==='SKU')&&l.some(x=>N(x)==='LOTE COMPLETO')&&l.some(x=>N(x)==='SALDO'));
 if(i<0)throw Error('Colunas SKU, LOTE COMPLETO, SALDO ausentes.');
 const h=linhas[i].map(N),map=new Map(),q=h.indexOf('SALDO'),s=h.indexOf('SKU'),l=h.indexOf('LOTE COMPLETO'),p=h.indexOf('POSTURA');
 for(const row of linhas.slice(i+1)){const sku=String(row[s]??'').trim(),lote=String(row[l]??'').trim();if(!sku&&!lote)continue;if(!sku||!lote)throw Error('Linha de estoque sem SKU/lote.');const saldo=Number(row[q]);if(!Number.isSafeInteger(saldo)||saldo<0)throw Error('Saldo de caixas inválido no lote '+lote);const k=JSON.stringify([N(sku),N(lote)]),a=map.get(k);if(a)a.saldo+=saldo;else map.set(k,{sku,lote,saldo,postura:p<0?'':String(row[p]??'')});}
 if(!map.size)throw Error('Estoque Embalado vazio.');return [...map.values()];
}
async function importar(file,tipo){
 if(!file)throw Error('Selecione o arquivo.');if(typeof XLSX==='undefined')throw Error('Biblioteca Excel indisponível.');
 const w=XLSX.read(await file.arrayBuffer(),{type:'array'}),aba=w.SheetNames.find(n=>N(n)===N(tipo==='embalado'?'ESTOQUE':'1. ESTOQUE'));
 if(!aba)throw Error('Aba de estoque não encontrada.');
 const linhas=XLSX.utils.sheet_to_json(w.Sheets[aba],{header:1,defval:'',raw:true});
 if(tipo==='embalado')return lerEmbalado(linhas);
 const {extrairParipassu}=await import('./leitor-paripassu.mjs');return extrairParipassu(linhas).itens;
}
function observar(uid){
 unsub.forEach(f=>f());unsub=[];
 for(const tipo of ['embalado','paripassu']){
  unsub.push(onSnapshot(doc(db,'rom_v250_contas',uid,'estoques_oficiais',tipo),snap=>{
   const d=snap.exists()?snap.data():null;versoes[tipo]=d?.versao||'';
   if(tipo==='embalado'&&d?.itens?.length){window.estoqueTesteConsulta=new Map(d.itens.map(x=>[x.sku+'\u0000'+x.lote.toUpperCase(),x]));window.reservaTesteAtiva=true;for(const fn of ['atualizarResumoReservaTeste','renderizarEstoqueCompletoTeste','operadorAtualizarCardsEstoque','renderizarPendenciasConferenciaEstoque'])try{window[fn]?.()}catch{}}
   window.__etapa4=window.__etapa4||{};window.__etapa4[tipo]=d?.itens||null;
   const e=window.__etapa4.embalado,p=window.__etapa4.paripassu;
   if(e&&p){const r=conferirEstoques(e,p);const el=$('etapa4Resumo');if(el)el.textContent=r.conferidos+' lotes | '+r.conformes+' conformes | '+r.pendencias.length+' pendências. Dados sincronizados no Firebase.';const out=$('etapa4Pendencias');if(out){out.replaceChildren();for(const x of r.pendencias){const li=document.createElement('li');li.textContent=x.sku+' / '+x.lote+' — '+x.tipo+' ('+x.diferenca+' caixas)';out.appendChild(li)}}}
   mostrar('Firebase conectado — '+tipo+': '+(d?.itens?.length??0)+' lotes; versão '+(versoes[tipo]||'não importada'));
  },e=>mostrar('Firebase: '+e.message)));
 }
}
onAuthStateChanged(auth,u=>{unsub.forEach(f=>f());unsub=[];if(u)observar(u.uid);else mostrar('Faça login na Central de Conexão para compartilhar os estoques.')});
$('etapa4Publicar')?.addEventListener('click',async()=>{
 const b=$('etapa4Publicar');b.disabled=true;
 try{
  await auth.authStateReady();const u=auth.currentUser;if(!u)throw Error('Autenticação necessária na Central de Conexão.');
  const tipo=$('etapa4Tipo').value,file=$('etapa4Arquivo').files?.[0],itens=await importar(file,tipo);
  if(!navigator.onLine)throw Error('Sem conexão. Arquivo não publicado.');
  if(JSON.stringify(itens).length>750000)throw Error('Estoque excede tamanho seguro para um documento Firebase; publicação cancelada sem perda de dados.');
  if(!confirm('Publicar '+itens.length+' lotes de '+tipo+' para os aparelhos autenticados? A planilha oficial não será modificada.'))return;
  const versao=crypto.randomUUID();
  const r=await publicarEstoqueOficial({db,uid:u.uid,tipo,dados:{tipo,nome:file.name,versao,itens},versaoEsperada:versoes[tipo],doc,runTransaction,autorizado:true});
  mostrar('Publicado no Firebase: '+r.quantidadeLotes+' lotes, versão '+r.versao);
 }catch(e){mostrar('Publicação não concluída: '+e.message)}finally{b.disabled=false}
});
