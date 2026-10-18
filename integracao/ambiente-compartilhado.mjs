// Resolução de ambiente compartilhado baseada em associação feita por administrador.
// O ambiente nunca é criado automaticamente pelo cliente.
import {doc,getDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {permissoesDoUsuario} from './perfis-usuarios.mjs';
export async function resolverAmbienteUsuario({db,uid}){
 if(!uid)throw Error('Autenticação necessária.');
 const vinculo=await getDoc(doc(db,'romaneio_usuarios',uid));
 if(!vinculo.exists())throw Error('Usuário ainda não vinculado a um ambiente. Solicite acesso ao administrador.');
 const ambienteId=String(vinculo.data().ambienteId||'');
 if(!/^[a-zA-Z0-9_-]{6,128}$/.test(ambienteId))throw Error('Vínculo de ambiente inválido.');
 const membroSnap=await getDoc(doc(db,'romaneio_ambientes',ambienteId,'membros',uid));
 const membro=membroSnap.exists()?membroSnap.data():null;
 const permissoes=permissoesDoUsuario(membro);
 if(!permissoes)throw Error('Usuário inativo ou sem perfil válido.');
 return {ambienteId,uid,perfil:permissoes.perfil,permissoes};
}
