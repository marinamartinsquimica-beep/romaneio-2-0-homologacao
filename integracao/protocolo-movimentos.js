/* Protocolo 2.0.50: preparação de operações para envio idempotente.
 * Sem rede e sem escrita: a aplicação deverá confirmar cada ID no servidor
 * antes de remover qualquer item da fila local.
 */
const TIPOS=new Set(['inclusao','edicao','exclusao']);
const ID=/^[a-zA-Z0-9_-]{8,160}$/;
export function prepararLoteMovimentos(fila,{limite=50}={}){
 if(!Array.isArray(fila))throw new TypeError('Fila inválida');
 if(!Number.isInteger(limite)||limite<1||limite>500)throw new RangeError('Limite inválido');
 const vistos=new Set(),lote=[],rejeitados=[];
 for(const [indice,operacao] of fila.entries()){
  const id=operacao?.id;
  if(typeof id!=='string'||!ID.test(id)||!TIPOS.has(operacao?.tipo)||!operacao?.item||typeof operacao.item!=='object'||Array.isArray(operacao.item)){
   rejeitados.push({indice,motivo:'Operação inválida'});continue;
  }
  if(vistos.has(id)){rejeitados.push({indice,id,motivo:'ID repetido na fila'});continue;}
  vistos.add(id);
  if(lote.length>=limite)continue;
  const copia=JSON.parse(JSON.stringify(operacao));
  if(copia.tipo==='edicao'&&(!copia.antes||typeof copia.antes!=='object')){
   rejeitados.push({indice,id,motivo:'Edição sem estado anterior'});continue;
  }
  lote.push(copia);
 }
 return {lote,rejeitados,total:fila.length};
}
export function reconciliarConfirmacoes(fila,confirmacoes){
 if(!Array.isArray(fila)||!Array.isArray(confirmacoes))throw new TypeError('Confirmações inválidas');
 // Confirmação só remove o ID exato; falhas, IDs ausentes e itens novos permanecem.
 const confirmados=new Set(confirmacoes.filter(c=>c&&c.confirmado===true&&typeof c.id==='string').map(c=>c.id));
 return {pendentes:fila.filter(op=>!confirmados.has(op?.id)),confirmados:fila.filter(op=>confirmados.has(op?.id)).length};
}
export function validarRegistroRemoto(registro){
 return Boolean(registro&&typeof registro.id==='string'&&ID.test(registro.id)&&TIPOS.has(registro.tipo)&&registro.item&&typeof registro.item==='object'&&(! (registro.tipo==='edicao')||registro.antes));
}
