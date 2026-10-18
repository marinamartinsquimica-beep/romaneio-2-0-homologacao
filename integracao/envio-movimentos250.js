import {exigirFirebaseHomologacao} from './guarda-firebase-homologacao.mjs';
import {resolverAmbienteUsuario} from './ambiente-compartilhado.mjs';
/* 2.0.50: integração de envio sob comando explícito, desabilitada até homologação.
 * Não usa estoque oficial nem substitui entradas entre aparelhos.
 */
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {criarPublicadorMovimentos} from './publicador-firestore.js';
import {criarSincronizadorFila} from './sincronizador-fila.js';
const config={apiKey:'AIzaSyAtlG-oys01gqgCdiANbzuzx9Mh9SiMRQo',authDomain:'romaneio-2-0-laboratorio.firebaseapp.com',projectId:'romaneio-2-0-laboratorio',storageBucket:'romaneio-2-0-laboratorio.firebasestorage.app',messagingSenderId:'343680211941',appId:'1:343680211941:web:8ad689db2c09447c2ded0c'};
exigirFirebaseHomologacao(config);
const app=getApps().length?getApp():initializeApp(config),auth=getAuth(app),db=getFirestore(app);
const CHAVE='romaneio2_movimentos_pendentes_v1';
let ambienteEnvio=null;
const raizEnvio=()=>ambienteEnvio?.uid===auth.currentUser?.uid?['romaneio_ambientes',ambienteEnvio.ambienteId]:['rom_v250_contas',auth.currentUser.uid];
const habilitado=true; // Envio operacional autorizado; nenhuma baixa de estoque.
function ler(){const f=JSON.parse(localStorage.getItem(CHAVE)||'[]');if(!Array.isArray(f))throw Error('Fila local inválida');return f;}
function gravar(f){localStorage.setItem(CHAVE,JSON.stringify(f));}
const erros=[];
const publicador=criarPublicadorMovimentos({
 transacionar:fn=>runTransaction(db,fn),
 referencia:id=>doc(db,...raizEnvio(),'movimentos',id),
 registrarErro:e=>erros.push(e),
 obterUsuario:()=>auth.currentUser
});
const sincronizador=criarSincronizadorFila({ler,gravar,publicador,avisar:r=>window.dispatchEvent(new CustomEvent('romaneio:sincronizacao-resultado',{detail:r}))});
export async function sincronizarMovimentos250(){
 if(!habilitado)throw Error('Envio Firebase ainda não homologado; fila local preservada');
 if(!navigator.onLine)throw Error('Sem internet; fila local preservada');
 await auth.authStateReady();
 if(!auth.currentUser)throw Error('Reconecte o Firebase pela Central de Conexão');
 const uid=auth.currentUser.uid;ambienteEnvio=null;
 try{const vinculo=await resolverAmbienteUsuario({db,uid});if(auth.currentUser?.uid!==uid)throw Error('Sessão alterada durante a verificação');ambienteEnvio={uid,ambienteId:vinculo.ambienteId};}catch(e){if(e?.code!=='romaneio/sem-vinculo')throw e;/* Somente ausência confirmada de vínculo permite usar a conta legada. */}
 return sincronizador.executar();
}
export function estadoSincronizacao250(){return {habilitado,autenticado:!!auth.currentUser,pendentes:ler().length,erros:erros.slice(-10)};}
