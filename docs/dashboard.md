# Dashboard

Início direciona para `/app/dashboard` ou `/admin/dashboard`, segundo o perfil.
AppRoutes mantém a composição do shell e dos menus; em telas estreitas o dashboard
usa um seletor de navegação. Outras páginas preservam sua navegação existente.

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
entrega. Regras e contratos estão em `backend/docs/dashboard.md`.

Validação com Node 24: npm run audit, npm run format:check, npm run lint,
npm run test:coverage e npm run build. Em máquinas com poucos recursos, usar
`npm run test:coverage -- --maxWorkers=2`. Testes de interface usam dados sintéticos;
não existe fallback para mocks no código de produção.
