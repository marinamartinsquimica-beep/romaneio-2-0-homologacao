/* Adaptador Firestore 2.0.50. Injeção de dependências permite teste sem rede.
 * Coleção dedicada a movimentos; nenhuma escrita no estoque oficial.
 * Não habilitar em produção sem regras de segurança e testes ponta a ponta.
 */
import {prepararLoteMovimentos,reconciliarConfirmacoes} from './protocolo-movimentos.js';
export function criarPublicadorMovimentos({transacionar,referencia,registrarErro}){
 if([transacionar,referencia,registrarErro].some(fn=>typeof fn!=='function'))throw new TypeError('Dependências ausentes');
 async function publicar(fila,{limite=50}={}){
  const {lote,rejeitados}=prepararLoteMovimentos(fila,{limite});
  const confirmacoes=[];
  for(const op of lote){
   try{
    // Cada ID tem documento imutável. Reenvio do mesmo ID é confirmação,
    // nunca uma segunda movimentação. Conteúdo divergente é conflito.
    const estado=await transacionar(async tx=>{
     const ref=referencia(op.id);
     const anterior=await tx.get(ref);
     const conteudo={id:op.id,dispositivoId:String(op.dispositivoId||''),tipo:op.tipo,item:op.item,antes:op.antes||null,criadoEm:String(op.criadoEm||'')};
     if(anterior.exists()){
      const remoto=anterior.data();
      if(JSON.stringify(remoto)!==JSON.stringify(conteudo))throw new Error('Conflito: mesmo ID com conteúdo diferente');
      return 'ja_existia';
     }
     tx.set(ref,conteudo);
     return 'gravado';
    });
    confirmacoes.push({id:op.id,confirmado:true,estado});
   }catch(e){
    registrarErro({id:op.id,mensagem:String(e?.message||e)});
    confirmacoes.push({id:op.id,confirmado:false});
   }
  }
  const reconciliado=reconciliarConfirmacoes(fila,confirmacoes);
  return {...reconciliado,confirmacoes,rejeitados};
 }
 return {publicar};
}
