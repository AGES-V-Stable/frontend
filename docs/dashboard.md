# Dashboard

O item "Dashboard" do menu e a raiz (`/`) levam a `/app/dashboard` ou `/admin/dashboard`,
segundo o perfil. AppRoutes mantém a composição do shell e dos menus.

Na linha de métricas, o cliente vê Saldo Disponível (`GET /v1/balance`), Economia
Acumulada e Volume Transacionado (`GET /v1/dashboard/transaction-volume`). O
administrador vê só a Economia Acumulada: saldo e volume pertencem à empresa do cliente.

`src/features/dashboard` contém os adapters Zod, consulta cancelável e apresentação.
Gráficos Recharts usam valores calculados pelo backend. Strings decimais são
preservadas em cards, tabela e tooltip; a conversão numérica serve só ao desenho.
Filtros são independentes e começam em seis meses. Respostas canceladas não atualizam
a tela. Dados incompletos, vazio e erro são estados distintos.

O card anual não acompanha filtros. A tabela consulta cinco registros por página,
até quatro páginas. O PDF empresarial consulta o histórico completo no backend,
sem depender dos registros da tela. Não existe exportação administrativa.
Todos os usuários ROLE_ADMIN acessam o mesmo dashboard consolidado e campos.

A economia é explicitamente estimada com spread fixo de 4%, autorizado para esta
entrega. Os contratos de economia, gráficos, liquidações e extrato
(`/v1/dashboard/{summary,remittance-volume,savings-history,settlements,statement.pdf}` e
os equivalentes em `/v1/admin/dashboard/`) estão definidos pelos schemas de
`api/dashboard.ts` e ainda não existem no backend.

Validação com Node 24: npm run audit, npm run format:check, npm run lint,
npm run test:coverage e npm run build. Em máquinas com poucos recursos, usar
`npm run test:coverage -- --maxWorkers=2`. Testes de interface usam dados sintéticos;
não existe fallback para mocks no código de produção.
