# Romaneio 2.0 — Contrato de sincronização (rascunho para validação)

**Ambiente:** branch de testes `teste/supabase-login-romaneio-2`. Não ativar na produção sem validação integrada.

## Estado atual confirmado
- Aplicativo de produção v2.0.49: operação local; botão SINCRONIZAR ainda não garante sincronização entre dispositivos.
- Projeto Supabase separado, com `rom_usuarios`, `rom_destinos`, `rom_paletes` e `rom_entradas` e políticas RLS iniciais.
- A autenticação e a leitura remota ainda não foram validadas devido à falha de conexão.
- Planilha oficial do SharePoint: **somente leitura durante testes**.

## Regras obrigatórias antes da integração
1. **Identidade:** toda operação remota exige sessão autenticada e usuário ativo; perfil administrador e operador com permissões explícitas.
2. **Operação offline:** registrar localmente eventos com `operacao_id` UUID único, dispositivo, horário local, entidade e payload; marcar como `pendente` até confirmação do servidor. Nunca confundir pendente com sincronizado.
3. **Idempotência:** `operacao_id` deve ser único no banco. Reenvio da mesma operação não pode criar duplicata.
4. **Conflitos:** o servidor decide sobre alterações concorrentes; não usar a última gravação silenciosamente. Mostrar divergência ao operador, preservar dados originais e permitir conciliação.
5. **Reserva:** impedir saldo negativo e dupla reserva com transação atômica no servidor. Não prometer reserva global enquanto offline.
6. **Destinos e paletes:** preservar números definidos manualmente; unicidade do número dentro de cada destino, com retorno claro de conflito.
7. **Exclusões:** exclusão de destino, palete ou entrada deve respeitar perfil e dependências. Preferir cancelamento auditável a apagar registros usados em expedição.
8. **Rastreabilidade:** guardar autor, data do servidor, operação, origem e histórico de correções.
9. **Segurança:** nenhuma `service_role` ou chave secreta no navegador, GitHub Pages ou PWA. Validar RLS e permissões antes de uso real.
10. **Estoque oficial:** importação/sincronização de leitura pode ser testada em cópia; baixas efetivas e substituição da planilha oficial só após homologação e confirmação humana.

## Ajustes de banco ainda necessários
- Criar tabela de operações/eventos com restrição única por `operacao_id`.
- Criar modelo de estoque, reservas e movimentos com referência à origem e versão.
- Implementar transações/RPC seguras para reserva, cancelamento e expedição.
- Rever RLS de escrita e integridade de vínculos; políticas atuais são preliminares.
- Definir índices, trilha de auditoria e política de retenção.

## Critérios de aceite
- Duas sessões distintas enxergam o mesmo palete após sincronizar.
- Reenvio repetido de operação não duplica caixas.
- Dois operadores tentando reservar o mesmo saldo não conseguem excedê-lo.
- Offline preserva alterações como pendentes e exibe conflitos após reconectar.
- Falha de rede não altera dados oficiais nem marca operação como concluída.
- Testes não alteram o aplicativo de produção nem o arquivo oficial.

## Próxima execução
Implementar um protótipo **isolado** de fila offline, sem acesso a estoque oficial ou alterações no aplicativo principal. Testar idempotência local, status pendente e resolução de conflitos simulados antes de conectar ao Supabase.
