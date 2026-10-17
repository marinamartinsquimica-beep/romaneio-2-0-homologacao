// Leitura específica do relatório PariPassu: "1. Estoque".
// Não confundir Quantidade (unidades) com Qtd. Caixas.
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export function extrairParipassu(linhas){
 const cab=linhas.findIndex(l=>l.some(v=>normalizar(v)==='TIPO PRODUTO')&&l.some(v=>normalizar(v)==='QTD. CAIXAS')&&l.some(v=>normalizar(v)==='LOTE'));
 if(cab<0)throw Error('Cabeçalho PariPassu não encontrado: Tipo Produto, Lote e Qtd. Caixas.');
 const h=linhas[cab].map(normalizar),iProduto=h.indexOf('TIPO PRODUTO'),iLote=h.indexOf('LOTE'),iCaixas=h.indexOf('QTD. CAIXAS');
 const mapa=new Map();let industriais=0,semSku=0,linhasValidas=0;
 for(const linha of linhas.slice(cab+1)){
  if(linha.every(v=>String(v??'').trim()===''))continue;
  const produto=String(linha[iProduto]??'').trim(),lote=String(linha[iLote]??'').trim();
  if(normalizar(produto)==='INDUSTRIAL'){industriais++;continue;}
  const match=produto.match(/^(\d+)\s*-/);
  if(!match){semSku++;continue;}
  if(!lote)throw Error('Lote ausente em produto com SKU '+match[1]+'.');
  const bruto=linha[iCaixas],saldo=Number(String(bruto??'').trim().replace(',','.'));
  if(String(bruto??'').trim()===''||!Number.isSafeInteger(saldo)||saldo<0)throw Error('Qtd. Caixas inválida para SKU '+match[1]+' e lote '+lote+'.');
  const sku=match[1],chave=JSON.stringify([sku,lote.toUpperCase()]),anterior=mapa.get(chave);
  if(anterior)anterior.saldo+=saldo;else mapa.set(chave,{sku,lote,saldo});
  linhasValidas++;
 }
 if(!mapa.size)throw Error('Nenhum SKU com caixas identificadas no PariPassu.');
 if(semSku)throw Error(semSku+' produtos sem código SKU reconhecível. Corrija o mapeamento antes de publicar.');
 return {itens:[...mapa.values()],industriaisIgnorados:industriais,linhasValidas};
}
