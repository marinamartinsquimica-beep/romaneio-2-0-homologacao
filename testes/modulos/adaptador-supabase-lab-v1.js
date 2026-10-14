/* Romaneio 2.0 — adaptador experimental para RPC de laboratório.
 * Não modifica o app oficial; não persiste credenciais.
 * Uso: const enviar = criarAdaptadorLab({url, chavePublica, obterToken});
 *      await fila.enviarPendentes(enviar);
 * IMPORTANTE: nomes de argumentos precisam coincidir com a assinatura da RPC.
 */
export function criarAdaptadorLab({ url, chavePublica, obterToken, argumentos } = {}) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url || "")) {
    throw new Error("URL Supabase inválida");
  }
  if (!chavePublica || typeof chavePublica !== "string") {
    throw new Error("Chave pública ausente");
  }
  if (/service.role|service_role/i.test(chavePublica)) {
    throw new Error("Nunca utilize chave service_role no navegador");
  }
  if (typeof obterToken !== "function") {
    throw new Error("Forneça uma função para obter a sessão autenticada");
  }
  const nomes = argumentos || {
    operacao: "p_operacao_id",
    palete: "p_palete_chave",
    caixas: "p_caixas",
    versao: "p_versao_esperada"
  };
  for (const chave of ["operacao", "palete", "caixas", "versao"]) {
    if (!/^[a-z][a-z0-9_]*$/.test(nomes[chave] || "")) {
      throw new Error("Nome de argumento RPC inválido: " + chave);
    }
  }
  const endpoint = url.replace(/\/$/, "") + "/rest/v1/rpc/rom_lab_movimentar";
  return async function enviar(operacao) {
    const token = await obterToken();
    if (!token || typeof token !== "string") {
      throw new Error("Sessão indisponível: operação permanece pendente");
    }
    const payload = {
      [nomes.operacao]: operacao.p_operacao_id,
      [nomes.palete]: operacao.p_palete_chave,
      [nomes.caixas]: operacao.p_caixas,
      [nomes.versao]: operacao.p_versao_esperada
    };
    let resposta;
    try {
      resposta = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: chavePublica,
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
    } catch (erro) {
      throw new Error("Falha de rede: " + (erro?.message || "sem conexão"));
    }
    if (!resposta.ok) {
      // Nunca confirme operações com erros HTTP.
      throw new Error("RPC retornou HTTP " + resposta.status);
    }
    let dados;
    try { dados = await resposta.json(); }
    catch { throw new Error("Resposta JSON inválida"); }
    if (Array.isArray(dados) && dados.length === 1) dados = dados[0];
    if (!dados || !["confirmada", "repetida", "conflito"].includes(dados.status)) {
      throw new Error("Resposta RPC não reconhecida");
    }
    return dados;
  };
}
