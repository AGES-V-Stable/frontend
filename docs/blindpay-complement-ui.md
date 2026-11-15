# Complementação BlindPay — telas de frontend

A rota autenticada **/register/blindpay/complementar** apresenta quatro telas independentes do cadastro Avenia atual:

1. País de emissão do documento e arquivo de selfie (JPG/PNG, até 3 MB).
2. Tipo e arquivo do comprovante de endereço (PDF/JPG/PNG, até 3 MB).
3. Aceite **hospedado** dos termos BlindPay (não confundir com aceite V-Stable).
4. Revisão dos itens selecionados e do estado pendente.

## Limites da entrega

Esta branch implementa exclusivamente **interface, navegação local, seleção de arquivos, validações e testes**. Nenhum arquivo ou dado é enviado/persistido; um refresh limpa os itens. O botão final permanece desativado. Não há simulação de aceite nem de cadastro aprovado. A rota não foi adicionada ao menu e precisa ser acionada diretamente enquanto o backend não define o ponto apropriado de entrada.

Para completar a integração, o backend precisa definir e disponibilizar:

- Contrato e endpoints autenticados para os novos campos e uploads (inclusive mapeamento dos tipos de comprovante aceitos pelo provedor).
- Fluxo de aceite hospedado BlindPay com URL segura fornecida pelo servidor e retorno de status verificado no servidor (nunca confiar apenas em redirect/checkbox do cliente).
- Regras de status e de elegibilidade para entrada no fluxo; proteção contra duplicidade de envios e reenvios.
- Validação de formato/conteúdo, tamanho, armazenamento e descarte dos documentos de identidade, selfie e endereço no backend.

O liveness ID atual da Avenia **não é o arquivo de selfie** exigido pela BlindPay. Não reutilizar o ID como se fosse um upload binário. Evitar guardar arquivos/identificadores em localStorage ou logs.

## Verificação

Rode localmente após clonar a branch:

    npm ci
    npm run format:check
    npm run lint
    npm run test:coverage
    npm run build

Os testes de interface ficam em src/features/onboarding/pages/BlindPayComplement/BlindPayComplement.test.tsx.
