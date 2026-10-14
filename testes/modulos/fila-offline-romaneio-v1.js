/* Romaneio 2.0 - fila offline isolada, sem integração automática à produção.
 * Requer contexto seguro (HTTPS/localhost) e IndexedDB.
 * Cada operação mantém o mesmo UUID em todas as tentativas.
 */
export class FilaRomaneioOffline {
  constructor(nomeBanco = "romaneio2-laboratorio-fila-v1") {
    this.nomeBanco = nomeBanco;
  }
  async banco() {
    return new Promise((resolve, reject) => {
      const pedido = indexedDB.open(this.nomeBanco, 1);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains("operacoes")) {
          const store = db.createObjectStore("operacoes", { keyPath: "operacao_id" });
          store.createIndex("por_estado", "estado", { unique: false });
        }
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
    });
  }
  async transacao(modo, acao) {
    const db = await this.banco();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("operacoes", modo);
        const store = tx.objectStore("operacoes");
        let resultado;
        tx.oncomplete = () => resolve(resultado);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Transacao cancelada"));
        acao(store, valor => { resultado = valor; }, tx);
      });
    } finally {
      db.close();
    }
  }
  async adicionar({ palete_chave, caixas, versao_esperada }) {
    if (typeof palete_chave !== "string" || !palete_chave.trim() ||
        !Number.isInteger(caixas) || caixas <= 0 ||
        !Number.isSafeInteger(versao_esperada) || versao_esperada <= 0) {
      throw new Error("Dados da operacao invalidos");
    }
    const registro = {
      operacao_id: crypto.randomUUID(), palete_chave: palete_chave.trim(),
      caixas, versao_esperada, estado: "pendente",
      criado_em: new Date().toISOString(), tentativas: 0, ultimo_erro: null
    };
    await this.transacao("readwrite", (store, set) => {
      store.add(registro); set(registro);
    });
    return registro;
  }
  async listar() {
    return this.transacao("readonly", (store, set) => {
      const req = store.getAll();
      req.onsuccess = () => set(req.result);
    });
  }
  async marcarResultado(id, resposta) {
    const status = resposta?.status;
    if (!["confirmada", "repetida", "conflito"].includes(status)) {
      throw new Error("Resposta do servidor nao reconhecida: manter pendente");
    }
    return this.transacao("readwrite", (store, set, tx) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const registro = req.result;
        if (!registro) { tx.abort(); return; }
        if (registro.estado === "confirmada") { set(registro); return; }
        registro.estado = status === "conflito" ? "conflito" : "confirmada";
        registro.resposta = resposta;
        registro.confirmado_em = new Date().toISOString();
        store.put(registro); set(registro);
      };
    });
  }
  async registrarFalha(id, erro) {
    return this.transacao("readwrite", (store, set, tx) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const registro = req.result;
        if (!registro) { tx.abort(); return; }
        if (registro.estado !== "pendente") { set(registro); return; }
        registro.tentativas += 1;
        registro.ultimo_erro = String(erro).slice(0, 300);
        store.put(registro); set(registro);
      };
    });
  }
  async enviarPendentes(enviar) {
    if (typeof enviar !== "function") throw new Error("Informe um adaptador de envio");
    const itens = (await this.listar()).filter(item => item.estado === "pendente");
    const resultados = [];
    for (const item of itens) {
      try {
        // O adaptador deve chamar a RPC rom_lab_movimentar e retornar seu JSON.
        // Erro de rede nunca confirma nem descarta uma operacao.
        const resposta = await enviar({
          p_operacao_id: item.operacao_id,
          p_palete_chave: item.palete_chave,
          p_caixas: item.caixas,
          p_versao_esperada: item.versao_esperada
        });
        resultados.push(await this.marcarResultado(item.operacao_id, resposta));
      } catch (erro) {
        resultados.push(await this.registrarFalha(item.operacao_id, erro));
      }
    }
    return resultados;
  }
}
