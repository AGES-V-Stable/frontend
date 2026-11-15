# KYC individual — telas e teste visual

Esta branch inclui o novo wizard `BlindPayIndividualKyc`, independente do KYB empresarial e do KYC Avenia.

## Rotas

- `/kyc/blindpay`: rota autenticada, conectada aos novos endpoints do backend da branch `feat/blindpay-individual-kyc`.
- `/dev/kyc/blindpay`: prévia **apenas Vite DEV**, sem requisições ao backend; todos os envios e aceites ficam desativados.
- `/dev/kyc/fluxo-completo`: passeio de prévia pelas telas originais e adicionais (inclusive KYC BlindPay).
- `/dev/blindpay/complementar`: prévia anterior das quatro informações adicionais.

## Percurso real

1. Dados pessoais e endereço do titular; o país BR é fixo no piloto.
2. Documento oficial e selfie; comprovante de endereço opcional para Standard, conforme a documentação BlindPay.
3. Aceite hospedado separado dos termos da V-Stable. O frontend consulta o backend para confirmar o webhook `tos.accept`.
4. Revisão e consentimento explícito para enviar documentos; após envio, status é atualizado separadamente.

O formulário utiliza `FormData` sem header Content-Type manual; o navegador define o boundary. Arquivos até 3 MB cada, conforme limitação vigente do backend.

## Como validar

No terminal dentro de frontend:

    git fetch origin
    git switch feat/blindpay-onboarding-complementar
    git pull --ff-only
    npm ci
    npm run dev

Navegue a `http://localhost:5173/dev/kyc/blindpay` ou `http://localhost:5173/dev/kyc/fluxo-completo`.

Para teste real, rode o backend da branch `feat/blindpay-individual-kyc`, configure credenciais development e habilite explicitamente `BLINDPAY_INDIVIDUAL_KYC_ENABLED=true`. O backend deve receber webhooks para confirmar o aceite. Não usar credenciais/identidades reais no modo de desenvolvimento.

Rode `npm run format:check`, `npm run lint`, `npm run test:coverage` e `npm run build`. Nenhuma verificação foi afirmada como aprovada sem execução.
