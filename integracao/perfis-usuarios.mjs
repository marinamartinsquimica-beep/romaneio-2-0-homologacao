// Permissões de interface; as regras do Firestore/Storage são a autoridade real.
// Nunca usar esta verificação para dispensar regras no servidor.
export const PERFIS=Object.freeze({
 administrador:Object.freeze({consultar:true,romaneio:true,prepararBaixa:true,publicarExcel:true,usuarios:true}),
 operador:Object.freeze({consultar:true,romaneio:true,prepararBaixa:true,publicarExcel:false,usuarios:false})
});
export function permissoesDoUsuario(membro){
 if(!membro||membro.ativo!==true)return null;
 const perfil=String(membro.perfil||'').toLowerCase();
 return PERFIS[perfil]?{perfil,...PERFIS[perfil]}:null;
}
export function exigirPermissao(membro,acao){
 const p=permissoesDoUsuario(membro);
 if(!p||p[acao]!==true)throw Error('Acesso não permitido ao usuário para: '+acao);
 return p;
}
