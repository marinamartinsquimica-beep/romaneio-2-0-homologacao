// Exportação PariPassu: aba "1. Estoque". Quantidade = ovos, Qtd. Caixas não é saldo confiável.
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function extrairParipassu(linhas){
 const cab=linhas.findIndex(l=>l.some(v=>normalizar(v)==='TIPO PRODUTO')&&l.some(v=>normalizar(v)==='QUANTIDADE')&&l.some(v=>normalizar(v)==='LOTE'));
 if(cab<0)throw Error('Cabeçalho PariPassu não encontrado: Tipo Produto, Lote e Quantidade.');
 const h=linhas[cab].map(normalizar),iProduto=h.indexOf('TIPO PRODUTO'),iLote=h.indexOf('LOTE'),iOvos=h.indexOf('QUANTIDADE');
 const mapa=new Map();let industriais=0,semSku=0,linhasValidas=0,fracionadas=0;
 for(const linha of linhas.slice(cab+1)){
  if(linha.every(v=>String(v??'').trim()===''))continue;
  const produto=String(linha[iProduto]??'').trim(),lote=String(linha[iLote]??'').trim();
  if(/INDUSTRI/i.test(normalizar(produto))){industriais++;continue;}
  const skuMatch=produto.match(/^(\d+)\s*-/),ovosCaixaMatch=produto.match(/\(\s*(90|240|360)\s*\)/);
  if(!skuMatch||!ovosCaixaMatch){semSku++;continue;}
  if(!lote)throw Error('Lote ausente em produto '+skuMatch[1]+'.');
  const bruto=linha[iOvos],ovos=Number(String(bruto??'').trim().replace(',','.'));
  if(String(bruto??'').trim()===''||!Number.isSafeInteger(ovos)||ovos<0)throw Error('Quantidade de ovos inválida no SKU '+skuMatch[1]+' e lote '+lote+'.');
  const sku=skuMatch[1],ovosPorCaixa=Number(ovosCaixaMatch[1]);
  const chave=JSON.stringify([sku,lote.toUpperCase()]),anterior=mapa.get(chave);
  if(anterior){
   if(anterior.ovosPorCaixa!==ovosPorCaixa)throw Error('Embalagens incompatíveis para SKU '+sku+' e lote '+lote+'.');
   anterior.ovos+=ovos;
  }else mapa.set(chave,{sku,lote,ovos,ovosPorCaixa});
  linhasValidas++;
 }
 if(!mapa.size)throw Error('Nenhum produto embalado reconhecido no PariPassu.');
 if(semSku)throw Error(semSku+' linhas sem SKU ou ovos/caixa reconhecidos. Publicação bloqueada para revisão.');
 const itens=[...mapa.values()].map(x=>{
  if(x.ovos%x.ovosPorCaixa!==0)fracionadas++;
  return {sku:x.sku,lote:x.lote,saldo:x.ovos/x.ovosPorCaixa,ovos:x.ovos,ovosPorCaixa:x.ovosPorCaixa};
 });
 if(fracionadas)throw Error(fracionadas+' lotes têm ovos que não formam caixas inteiras. Publicação bloqueada; revisar ou definir regra de caixas parciais.');
 return {itens,industriaisIgnorados:industriais,linhasValidas};
}
