# KYC BlindPay — telas de frontend

As telas de complementação BlindPay passaram a ser o fluxo real de KYC individual (Standard, residentes no Brasil). O wizard anterior `BlindPayIndividualKyc` foi removido para não haver dois fluxos.

## Rotas

- `/kyc/blindpay`: rota autenticada e conectada ao backend (`/v1/blindpay/kyc`).
- `/register/blindpay/complementar`: redireciona para `/kyc/blindpay`.
- `/dev/blindpay/complementar` e `/dev/kyc/blindpay`: prévia **apenas Vite DEV** (`previewOnly`), sem nenhuma requisição.
- `/dev/kyc/fluxo-completo`: passeio pelas telas do onboarding, incluindo esta.

## Etapas

1. **Dados pessoais**: nome, sobrenome, nascimento, CPF (dígito verificador validado), celular, CEP, endereço, cidade e estado. O backend não guarda esses dados do onboarding Avenia, por isso são pedidos aqui. O estado vai por extenso (`Rio Grande do Sul`), conforme a BlindPay pede para países fora dos EUA.
2. **Documento e selfie**: RG, CNH ou passaporte emitido no Brasil (frente e, exceto passaporte, verso) e selfie. Apenas JPG/PNG.
3. **Endereço**: tipo e arquivo do comprovante (PDF/JPG/PNG). As opções da tela são mapeadas para `UTILITY_BILL`, `BANK_STATEMENT`, `RENTAL_AGREEMENT`, `TAX_DOCUMENT` e `GOVERNMENT_CORRESPONDENCE`.
4. **Termos BlindPay**: o backend gera o link hospedado. O aceite só vale depois que o backend recebe o webhook assinado `tos.accept`; a tela consulta o status a cada 5 s. É possível gerar um novo link enquanto o aceite não for confirmado. Após aceitar, a BlindPay abre `BLINDPAY_INDIVIDUAL_KYC_REDIRECT_URL?tos_id=...` em outra aba, que mostra um aviso para voltar à aba original.
5. **Revisão**: confirmação explícita e envio multipart. Depois do envio, a tela mostra a situação (`verifying`, `approved`, `rejected`, `compliance_request`, `approved_rfi`, `pending_review`) e se atualiza a cada 15 s enquanto a análise está pendente.

Arquivos ficam só em memória até o envio (até 3 MB cada). Não há reenvio automático depois de uma falha ambígua.

## Verificação

    npm ci
    npx prettier --check src/features/onboarding src/app
    npm run lint
    npm run test:coverage
    npm run build

Testes em `src/features/onboarding/pages/BlindPayComplement/BlindPayComplement.test.tsx`.
