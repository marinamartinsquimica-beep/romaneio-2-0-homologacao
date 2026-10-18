// Conferência unilateral: só Embalado demanda correspondência no PariPassu.
const norm=x=>String(x??'').trim().toUpperCase();
const chave=x=>JSON.stringify([norm(x.sku),norm(x.lote),norm(x.postura)]);
function consolidar(itens){
 const mapa=new Map();
 for(const x of itens||[]){const sku=String(x?.sku??'').trim(),lote=String(x?.lote??'').trim(),postura=String(x?.postura??'').trim(),saldo=Number(x?.saldo);
 if(!sku||!lote||!Number.isFinite(saldo)||saldo<0)throw Error('Linha de estoque inválida.');
 const k=chave({sku,lote,postura}),a=mapa.get(k);if(a)a.saldo+=saldo;else mapa.set(k,{sku,lote,postura,saldo});}
 return mapa;
}
export function conferirEstoques(embalado,paripassu){
 const e=consolidar(embalado),p=consolidar(paripassu),pendencias=[],conformesItens=[];
 for(const [k,a] of e){const b=p.get(k);
 if(!b)pendencias.push({...a,tipo:'ausente_paripassu',embalado:a.saldo,paripassu:0,diferenca:a.saldo});
 else if(b.saldo+1e-9<a.saldo)pendencias.push({...a,tipo:'saldo_insuficiente_paripassu',embalado:a.saldo,paripassu:b.saldo,diferenca:a.saldo-b.saldo});
 else conformesItens.push({...a,paripassu:b.saldo});}
 pendencias.sort((a,b)=>a.sku.localeCompare(b.sku,'pt-BR')||a.lote.localeCompare(b.lote,'pt-BR'));
 return {conferidos:e.size,conformes:conformesItens.length,conformesItens,pendencias};
}
