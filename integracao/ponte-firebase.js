/* 2.0.50: adaptador isolado para sincronização, sem credenciais e sem acoplamento à UI.
 * Recebe Firestore injetado; a aplicação só ativa após autenticação e autorização.
 * NÃO executa escrita remota sem aprovação explícita do operador.
 */
import {compararConferencia,decidirAtualizacao} from './conferencia-compartilhada.js';
export function criarPonteConferencia({observar,publicar,lerLocal,avisar,autorizar}) {
  if([observar,publicar,lerLocal,avisar,autorizar].some(x=>typeof x!=='function')) throw new TypeError('Dependências obrigatórias');
  let parar=null,ultimo=null,ativo=false;
  function receber(documento) {
    if(!ativo)return;
    if(!documento||!Array.isArray(documento.estoque)||!Array.isArray(documento.romaneio)) {
      avisar({tipo:'erro',mensagem:'Conferência recebida incompleta; estado anterior preservado'});return;
    }
    const decisao=decidirAtualizacao(ultimo,documento);
    if(!decisao.aplicar) {
      if(decisao.motivo.startsWith('conflito')) avisar({tipo:'conflito',mensagem:decisao.motivo});
      return;
    }
    let pendencias;
    try { pendencias=compararConferencia(documento.romaneio,documento.estoque); }
    catch(e) { avisar({tipo:'erro',mensagem:e.message});return; }
    ultimo=documento;
    avisar({tipo:'conferencia',revisao:documento.revisao,pendencias:pendencias.filter(x=>x.pendente),resultado:pendencias,origem:'remota'});
  }
  return {
    iniciar() {
      if(ativo)return;
      if(!autorizar('ler'))throw new Error('Usuário sem permissão de conferência');
      ativo=true;
      try { parar=observar(receber,e=>avisar({tipo:'erro',mensagem:String(e?.message||e)})); }
      catch(e){ativo=false;throw e;}
    },
    parar(){ativo=false;if(typeof parar==='function')parar();parar=null;},
    estado(){return ultimo?{revisao:ultimo.revisao,origem:'remota'}:null;},
    async publicarConferencia(estoque,confirmado=false) {
      if(!confirmado)throw new Error('Publicação exige confirmação explícita');
      if(!autorizar('publicar'))throw new Error('Usuário sem permissão de publicação');
      if(!Array.isArray(estoque))throw new TypeError('Estoque inválido');
      // Nunca envia o romaneio local como substituição silenciosa do remoto.
      const local=lerLocal();
      if(!local||!Array.isArray(local.romaneio))throw new Error('Romaneio local indisponível');
      return publicar({estoque,origem:'conferencia_operador',baseRevisao:ultimo?.revisao??null});
    }
  };
}
