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
