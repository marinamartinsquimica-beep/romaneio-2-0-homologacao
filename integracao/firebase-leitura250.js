// 2.0.50: adaptador de leitura em tempo real para registros de teste autenticados.
// Coleção isolada: NÃO usar para dados operacionais até aprovação das regras e dos testes.
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const config={apiKey:'AIzaSyAtlG-oys01gqgCdiANbzuzx9Mh9SiMRQo',authDomain:'romaneio-2-0-laboratorio.firebaseapp.com',projectId:'romaneio-2-0-laboratorio',storageBucket:'romaneio-2-0-laboratorio.firebasestorage.app',messagingSenderId:'343680211941',appId:'1:343680211941:web:8ad689db2c09447c2ded0c'};
const app=getApps().length?getApp():initializeApp(config);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const status=$('sync250Status'),detalhe=$('sync250Detalhe');
let parar=()=>{},ultimaRevisao=0;
function informar(texto){status.textContent=texto;}
function exibir(d){
 if(!d){informar('Aguardando conferência compartilhada');detalhe.textContent='Nenhuma conferência de laboratório disponível';return;}
 if(d.revisao<ultimaRevisao)return;
 ultimaRevisao=d.revisao;
 const falta=Math.max(0,d.reservado-d.estoqueConferido);
 informar(falta?'Pendência compartilhada: '+falta+' CX':'Conferência compartilhada regularizada');
 detalhe.textContent='Teste 17.12 | SKU '+d.sku+' | Lote '+d.lote+' | Romaneio '+d.reservado+' CX | Estoque '+d.estoqueConferido+' CX | Revisão '+d.revisao;
}
onAuthStateChanged(auth,user=>{
 parar();parar=()=>{};ultimaRevisao=0;
 if(!user){informar('Aguardando login no Firebase (laboratório)');detalhe.textContent='A leitura exige autenticação';return;}
 informar('Conectando conferência de laboratório…');
 parar=onSnapshot(doc(db,'rom_lab_conferencia1712','LAB-CONFERENCIA'),snap=>exibir(snap.exists()?snap.data():null),e=>{informar('Erro de sincronização');detalhe.textContent=e.message;});
});
window.addEventListener('romaneio:entradas-salvas',()=>{
 const dados=JSON.parse(localStorage.getItem('entradas')||'[]');
 $('sync250Local').textContent='Entradas salvas neste dispositivo: '+dados.length+' (não enviadas)';
});
