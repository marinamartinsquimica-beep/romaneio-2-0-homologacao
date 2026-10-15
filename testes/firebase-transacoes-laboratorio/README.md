# Laboratório isolado de transações Firestore

Este projeto é independente do Romaneio e usa somente o Firebase `romaneio-2-0-laboratorio`. Palete e coleções exclusivas: `LAB-PALLET-50`, `rom_lab_transacoes_paletes`, `rom_lab_transacoes_operacoes` e `rom_lab_transacoes_auditoria`. Não aponta para coleções do estoque real. A Web API key pública e a chave pública reCAPTCHA v3 do App Check são solicitadas no navegador; nenhuma está versionada neste diretório.

## Salvaguardas

- Navegador autentica com Firebase Auth; App Check reCAPTCHA v3 é exigido nas callable functions.
- Clientes podem ler documentos de laboratório apenas com e-mail verificado. Regras negam todas as gravações diretas e negam qualquer outra coleção.
- Inicialização e movimentos são executados somente pelo backend Callable Functions (Admin SDK), nunca por escrita Firestore no cliente.
- Inicialização cria o saldo 50 somente se o documento ainda não existir; se já existir, preserva o saldo. Esquema divergente é recusado.
- `moveLabBoxes` transaciona palete, registro idempotente UUID v4 e auditoria append-only. Reenvio exato devolve recibo sem novo débito; reuso do UUID com parâmetros diferentes é recusado. Saldo insuficiente não grava.
- Duas flags de backend, `LAB_RULES_VALIDATED` e `LAB_MOVEMENTS_ENABLED`, têm padrão `false`. A UI só oferece movimentos se o backend retornar ambas habilitadas. **Não habilite flags antes de testar regras e backend.**

## Validação local

Pré-requisito: Node.js 20+ e Firebase CLI disponível. Nenhum teste abaixo usa dados reais.

1. Testes unitários do serviço, com Firestore fake serializado (verifica seed sem reset, repetição de UUID, reuso incompatível, retirada simultânea, saldo mínimo e bloqueio por padrão):
   - `npm --prefix functions test`
2. Testes das regras no Firestore Emulator:
   - `npm --prefix tests install`
   - Na pasta do laboratório: `firebase emulators:exec --config firebase.json --project demo-romaneio-firestore-lab --only firestore "npm --prefix tests test"`

   Firebase Rules Unit Testing abre a porta do Emulator em `8080`; rode só um processo Emulator por vez (o comando acima coordena inicialização e encerramento).

Os unit tests não substituem o emulador, nem provam contenção/concorrência real de Firestore. Não habilite as flags até ambos os conjuntos passarem e a configuração do App Check ter sido validada.

## Implantação manual — somente no projeto de laboratório

O arquivo `firestore.rules` é um ruleset completo: publicar/substituir as regras do projeto Firebase faz com que **todas as outras coleções fiquem negadas**. Confirme o projeto alvo e a revisão das regras vigentes antes de implantar. Nunca use este arquivo no Firebase de produção.

Depois de revisar o impacto, com Firebase CLI autenticada por uma pessoa autorizada, a partir desta pasta, pode-se implantar as regras e funções somente no projeto de laboratório:

`firebase deploy --config firebase.json --project romaneio-2-0-laboratorio --only firestore:rules,functions:romaneio-firestore-lab`

Durante a implantação, manter `LAB_RULES_VALIDATED=false` e `LAB_MOVEMENTS_ENABLED=false`. Configurar o App Check reCAPTCHA v3 para o web app e o domínio `marinamartinsquimica-beep.github.io`; a chave de site é pública e deve ser informada no formulário, não é segredo do servidor.

Primeiro autenticar, conferir a leitura e usar **Criar palete se ausente**. Essa callable pode ser testada com as flags de movimento desabilitadas e nunca reinicializa saldo. Antes de habilitar movimentos, validar as regras no Emulator, revisar os resultados dos testes unitários e testar no projeto exclusivo de laboratório. A habilitação das duas flags é uma ação administrativa separada e não faz parte da publicação GitHub Pages.

## Limitações deste pacote

- O código ainda não foi implantado no Firebase e não foi testado contra Emulator/Firestore real; o laboratório publicado inicia sem movimentações habilitadas.
- As regras negam também os outros laboratórios Firestore existentes no mesmo projeto se substituírem as regras atuais. Faça revisão autorizada antes de implantá-las.
- Contas Firebase devem estar verificadas por e-mail. O App Check requer uma chave de site reCAPTCHA v3 previamente registrada para o app/domínio.
- A captura e auditoria cobrem operações aceitas; tentativas recusadas por saldo insuficiente não são persistidas no log.
