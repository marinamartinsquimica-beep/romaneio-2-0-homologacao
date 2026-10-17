# Preparação 2.0.50 — integração protegida

- **Base estável:** branch `backup/v2.0.49`, cópia do repositório antes de alterações na integração.
- **Desenvolvimento:** `desenvolvimento/v2.0.50`.
- **Produção:** `main` permanece intocada até aprovação expressa.
- **Preservar:** layout, painel de pendências, botão CONFERIR ROMANEIO, alerta original com OK, Excel, caminhões, destinos, offline, histórico, atualização do PWA.
- **Reaproveitar da 2.0.49:** `importarEstoqueTeste`, `renderizarPendenciasConferenciaEstoque`, `atualizarResumoReservaTeste`.
- **Validado em laboratório:** reserva sem bloqueio; correção de reserva; atualização simulada de estoque; recebimento instantâneo entre computador e celular.
- **Ainda não validado:** sincronização real do Romaneio entre usuários, autenticação e autorização por perfil, reconciliação de alterações offline, publicação e substituição da planilha oficial, atualização automática de arquivo compartilhado.
- **Primeira alteração isolada:** `integracao/conferencia-compartilhada.js`, função pura para comparação por SKU/lote e quantidade, sem alterar a interface ou persistência.
- **Critério de integração:** não remover pendência por clique em OK; remover apenas após leitura de estado atualizado e comparação sem divergência; não bloquear operação; preservar histórico e rastreabilidade.
- **Atenção:** na 2.0.49 a comparação existente agrega por SKU/lote; a postura aparece como referência. Validar se a regra final exige chave SKU/lote/postura antes de substituir o algoritmo existente.

## Decisão de acesso — 17/10/2026

- Operação utiliza uma única conta Firebase Auth compartilhada entre dispositivos. Não confundir conta autenticada com identidade individual do funcionário.
- Criar aba MASTER separada para conexão/reconexão, estado online/offline, diagnóstico e fila pendente. Não expor credenciais no HTML, GitHub ou localStorage.
- Firebase Auth deve persistir a sessão no aparelho quando permitido; perda de rede não deve apagar fila nem exigir novo login. Se sessão expirar, pedir autenticação novamente na MASTER; nunca armazenar senha.
- Acesso MASTER exige autorização separada por UID/claim ou documento de papel protegido por regras; possuir login operacional não concede MASTER automaticamente. Com uma única conta operacional compartilhada, é necessária outra identidade administrativa para separar privilégios de forma efetiva.
- Não armazenar credenciais nem autorizar acesso MASTER por PIN fixo no JavaScript. Responsável/dispositivo e trilha de eventos preservados.
- Regras Firestore e fluxo de login ainda dependem de validação e testes antes de publicar; não habilitar gravação de dados reais no projeto laboratório sem autorização por função e separação de dados.
