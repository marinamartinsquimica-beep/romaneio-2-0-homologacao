// Conferência somente leitura: não modifica nenhuma base oficial.
const chave=x=>JSON.stringify([String(x.sku||'').trim().toUpperCase(),String(x.lote||'').trim().toUpperCase()]);
function consolidar(itens){
 const mapa=new Map();
 for(const item of itens||[]){
  const sku=String(item?.sku||'').trim(),lote=String(item?.lote||'').trim(),saldo=Number(item?.saldo);
  if(!sku||!lote||!Number.isFinite(saldo)||saldo<0)throw Error('Linha de estoque inválida.');
  const k=chave({sku,lote}),prev=mapa.get(k);
  if(prev){prev.saldo+=saldo;if(!Number.isFinite(prev.saldo))throw Error('Soma de caixas inválida.');}else mapa.set(k,{sku,lote,saldo,conflitoRastreamento:item?.conflitoRastreamento===true});
 }
 return mapa;
}
export function conferirEstoques(embalado,paripassu){
 const e=consolidar(embalado),p=consolidar(paripassu),pendencias=[];
 for(const [k,a] of e){
  const b=p.get(k);
  if(b?.conflitoRastreamento)pendencias.push({sku:a.sku,lote:a.lote,tipo:'conflito_rastreamento',embalado:a.saldo,paripassu:b.saldo,diferenca:a.saldo-b.saldo});
  if(!b)pendencias.push({sku:a.sku,lote:a.lote,tipo:'ausente_paripassu',embalado:a.saldo,paripassu:0,diferenca:a.saldo});
  else if(Math.abs(a.saldo-b.saldo)>1e-9||!Number.isInteger(b.saldo))pendencias.push({sku:a.sku,lote:a.lote,tipo:Math.abs(a.saldo-b.saldo)<=1e-9?'caixa_fracionada':'divergencia_saldo',embalado:a.saldo,paripassu:b.saldo,diferenca:a.saldo-b.saldo});
 }
 for(const [k,b] of p)if(!e.has(k))pendencias.push({sku:b.sku,lote:b.lote,tipo:'ausente_embalado',embalado:0,paripassu:b.saldo,diferenca:-b.saldo});
 pendencias.sort((a,b)=>a.sku.localeCompare(b.sku,'pt-BR')||a.lote.localeCompare(b.lote,'pt-BR'));
 return {conferidos:new Set([...e.keys(),...p.keys()]).size,conformes:[...e].filter(([k,a])=>p.has(k)&&!p.get(k).conflitoRastreamento&&Math.abs(p.get(k).saldo-a.saldo)<=1e-9&&Number.isInteger(p.get(k).saldo)).length,pendencias};
}
