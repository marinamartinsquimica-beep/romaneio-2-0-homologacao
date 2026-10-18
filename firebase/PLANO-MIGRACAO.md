# Persistência centralizada — Bloco de migração

## Status: preparação em branch, NÃO publicada na produção

A versão operacional 2.0.57 continua na branch main. Este bloco prepara:
- Administrador e Operador como membros de um AMBIENTE único, independente do UID de quem fez login.
- Documento `romaneio_ambientes/{ambienteId}/membros/{uid}` com `perfil` e `ativo`.
- Excel completo no Storage em arquivo imutável por versão.
- Documento `romaneio_ambientes/{ambienteId}/excel_oficiais/{tipo}` com `vigente` e `anterior`.
- Sem sobrescrever dados locais, estoque oficial legado ou movimentos no Firestore durante a migração.

## Antes de habilitar na interface

1. Criar/configurar Firebase Storage no projeto e confirmar custos do plano aplicável.
2. Publicar e validar `firebase/storage.rules` e novas regras Firestore para os membros e ponteiros dos arquivos.
3. Criar o ambiente e registrar o administrador inicial por operação privilegiada no console/ambiente seguro. **Nunca permitir que o navegador se autoatribua perfil de administrador.**
4. Migrar ou referenciar o histórico antigo em `rom_v250_contas/{uid}` sem apagar os dados antigos.
5. Criar procedimento administrativo de convite de usuário já autenticado ou integração confiável para provisionar novos usuários; não expor credenciais ou privilégios no browser.
6. Integrar botão PUBLICAR para fazer validação, upload do Excel, publicação do estoque e movimentação segura do ponteiro. Se alguma parte falhar, não alterar a versão oficial vigente.
7. Implementar restauração da última versão Excel em um computador novo e testar ambos os perfis em navegadores independentes.
8. Implementar recuperação de destinos excluídos e histórico de baixas entre usuários, mantendo operação offline, idempotência e reconciliação. Só depois dessa homologação liberar produção.

## Retenção
A interface exibe um arquivo vigente e a cópia anterior. Arquivos imutáveis mais antigos podem permanecer como órfãos até uma rotina administrativa os eliminar com segurança; não apagar os arquivos antes de assegurar que nenhum ponteiro ou recuperação os utiliza.

## Atenção à baixa
A preparação não substitui o arquivo do estoque, e o botão de confirmação removido não volta. A efetivação continua sob controle do operador.
