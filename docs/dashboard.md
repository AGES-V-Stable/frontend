# Dashboard

O item "Dashboard" do menu e a raiz (`/`) levam a `/app/dashboard` (cliente PME) ou
`/admin/dashboard` (administrador). AppRoutes mantém a composição do shell e dos menus.

## Blocos

Na ordem do Figma (V-Stable-Design, frames 353:877 e 357:939):

- Linha de métricas (`MetricCard`): o cliente vê Saldo Disponível, Economia Acumulada e Volume
  Transacionado; o administrador vê Economia Acumulada e Volume Transacionado.
- Câmbio Atual (`ExchangeRateCard`), para cliente e administrador.
- Barra "Filtrar dados" (`DashboardFilters`).
- Gráficos Recharts de histórico de economia e de volume de remessas, com o total do período.
- Últimas liquidações, paginadas no backend, com a ação "Detalhes".

## Filtros

Um único filtro vale para todos os blocos que dependem de período: economia, volume
transacionado, gráficos e liquidações (que voltam à página 1). O saldo é instantâneo e não
acompanha o período. Os filtros só são aplicados em "Aplicar filtros"; "Limpar filtros" volta ao
padrão e já aplica.

- Período: Este mês, Últimos 6 meses (padrão), Últimos 12 meses, Desde o início ou Personalizado.
  Os presets viram `startDate`/`endDate` no fuso America/Sao_Paulo, com fim inclusivo.
- Período inválido (início posterior ao fim, ou fora de 01/01/2000 a 31/12/2100) é bloqueado com
  a mesma mensagem do histórico de transferências.
- Empresa: só para o administrador, com "Todas as empresas" (consolidado) e a lista de
  `GET /v1/companies/summaries`. O cliente nunca envia `companyId`; a empresa vem do token.

## Contratos

Adapters Zod em `src/features/dashboard/api`. O contrato completo e as regras de cálculo estão em
`backend/docs/dashboard.md`. Strings decimais são preservadas em cards, tabela e tooltip; a
conversão numérica serve só ao desenho dos gráficos. Respostas canceladas não atualizam a tela;
carregamento, vazio, dados incompletos e erro com "Tentar novamente" são estados distintos.

A economia é uma estimativa frente a um spread bancário de referência configurado no backend; a
nota exibida usa o percentual devolvido pela API.

"Detalhes" leva o cliente a `/app/transferencias/{id}` e o administrador ao histórico
administrativo com o drawer aberto (`/admin/transferencias?transferId={id}`).

O extrato em PDF (`downloadStatement`) não aparece na tela até o backend oferecer o endpoint.

## Câmbio atual (cicd#55)

`GET /v1/exchange-rates`, buscado uma vez ao montar o dashboard (sem polling) e independente dos
filtros. Cada par aparece como "BRL → USDC", com "1 USDC = R$ 5,4700" (4 casas, formatadas da
string decimal) e "Atualizado em dd/mm/aaaa hh:mm" no fuso do navegador. A taxa é de referência,
sem tarifas. O cliente não aplica regra de validade: o status vem do backend.

- `STALE`: badge "Cotação desatualizada" e valor esmaecido, com a data da última atualização.
- `UNAVAILABLE`: "Cotação indisponível", sem número nem data. O schema rejeita uma cotação
  indisponível com taxa, ou disponível sem taxa ou data.
- Falha da requisição: mensagem e "Tentar novamente", sem afetar os outros blocos.

## Validação

Com Node 24: `npm run audit`, `npm run format:check`, `npm run lint`, `npm run test:coverage` e
`npm run build`. Em máquinas com poucos recursos, usar `npm run test:coverage -- --maxWorkers=2`.
Testes de interface usam dados sintéticos; `src/test/fixtures/dashboardResponses.ts` guarda
respostas reais do backend como contrato. Não existe fallback para mocks no código de produção.
