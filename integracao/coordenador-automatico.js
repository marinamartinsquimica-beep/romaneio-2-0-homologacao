/* Sincronização automática: coordenador isolado, sem baixa de estoque.
 * Falhas nunca removem movimentos; apenas o sincronizador confirmado pode fazê-lo.
 * O adaptador de recepção deve ser homologado antes de conectar à interface.
 */
export function criarCoordenadorAutomatico({sincronizar,receber,pendentes,autenticado,online,avisar}) {
  if ([sincronizar,receber,pendentes,autenticado,online,avisar].some(fn=>typeof fn!=='function')) throw TypeError('Dependências inválidas');
  let ativo=false,execucao=null,novidade=false;
  async function executar() {
    if(!ativo||!online()||!autenticado())return {adiado:true};
    if(execucao){novidade=true;return execucao;}
    execucao=(async()=>{
      try {
        // Primeiro publica a fila local para impedir união remota sobre movimentos não enviados.
        const resultado=pendentes()>0?await sincronizar():{confirmados:0,pendentes:0};
        if(pendentes()>0){avisar({tipo:'pendencias',resultado});return resultado;}
        await receber();
        avisar({tipo:'sincronizado',resultado});
        return resultado;
      }catch(erro){avisar({tipo:'erro',mensagem:String(erro?.message||erro)});return {erro:true};}
    })().finally(()=>{execucao=null;if(novidade){novidade=false;queueMicrotask(()=>{if(ativo)executar();});}});
    return execucao;
  }
  return {
    iniciar(){ativo=true;return executar();},
    parar(){ativo=false;novidade=false;},
    movimentacao(){return executar();},
    reconexao(){return executar();},
    estado(){return {ativo,emAndamento:!!execucao};}
  };
}
