# Frontend V-Stable

React, TypeScript, Vite, React Router, Tailwind CSS e Zod. O CI usa Node.js 24 e `npm ci` com `package-lock.json`.

## Desenvolvimento

```bash
npm ci
npm run dev
```

A aplicação usa a mesma origem por padrão. O Vite encaminha `/v1` e `/api` para `http://localhost:8080`; configure `API_PROXY_TARGET` para outro backend de desenvolvimento. Em produção, o servidor que publica a SPA precisa encaminhar esses prefixos ao backend e devolver `index.html` nas rotas da aplicação.

Para um backend em outra origem, configure `VITE_API_URL=https://api.exemplo.com` antes do build. O valor deve conter apenas protocolo, host e porta opcional, sem `/api` ou `/v1`. As permissões CORS do backend devem permitir a origem da SPA e expor Authorization e Content-Disposition.

## Arquitetura

```text
src/
  app/          # AppRoutes, composição, guards, shell e NavBar
  features/
    auth/       # login, identidade e sessão compartilhada
    onboarding/ # cadastro, documentos, liveness e KYC
    clients/    # listagem administrativa de empresas
    beneficiaries/ # listagem, detalhes e cadastro
    transfers/  # histórico administrativo, cotação, criação, detalhes e comprovantes
  shared/       # UI de apresentação, HTTP, configuração, paths, assets e formatadores
  test/fixtures/ # dados usados exclusivamente em testes
```

`AppRoutes` é o único responsável por escolher menus, destinos, seleção e conteúdo conforme o perfil autenticado. Ele compõe um shell persistente com `NavBar` de apresentação e `Outlet`. Páginas de features não importam shell/NavBar nem configuram menus. Login e cadastro ficam fora do shell.

O perfil de navegação e os redirecionamentos usam `account_type` do JWT salvo na chave `token` do `localStorage`, com suporte ao campo legado `role: ["ROLE_ADMIN"]` quando `account_type` está ausente. Tokens ausentes ou malformados não selecionam o perfil administrativo. Essa leitura orienta a interface; a autorização continua no backend.

A sessão consulta `/v1/users/me` uma vez por ciclo de autenticação e carrega a empresa quando existe vínculo empresarial. As páginas consomem `useSession`, sem repetir consultas de identidade. Falhas de rede oferecem nova tentativa; 401 invalida a sessão correspondente, sem apagar um login mais recente nem confundir tokens de onboarding e login.

O menu administrativo contém Início, Clientes PME, Auditoria (Transferências e Beneficiários) e Configurações. O menu empresarial contém Início, Beneficiários, Transferências e Configurações. Configurações e Suporte estão visíveis, mas desabilitados. Nome, CNPJ e iniciais vêm da conta autenticada. Não há demonstrações nem fallback automático para fixtures.

O ESLint bloqueia dependências de shared para app/features, de features para app/fixtures e imports privados entre features. Acesso público a auth é permitido; transfers também pode usar a seleção pública de beneficiaries. Testes podem importar fixtures e serviços privados para validar contratos.

## Rotas

| Tela empresarial          | Rota                       |
| ------------------------- | -------------------------- |
| Beneficiários             | `/app/beneficiarios`       |
| Cadastro de beneficiário  | `/app/beneficiarios/novo`  |
| Criação de transferência  | `/app/transferencias/nova` |
| Detalhes de transferência | `/app/transferencias/:id`  |

As rotas anteriores `/beneficiarios`, `/beneficiarios/novo`, `/transferencias` e `/transferencias/:id` redirecionam preservando identificador, query string e fragmento. `/` e Início direcionam administradores para `/admin/clientes-pme` e usuários empresariais para `/app/beneficiarios`; visitantes vão para `/login`. Rotas administrativas, login e cadastro mantêm seus endereços.

## Contratos consumidos

| Feature                          | API                                                                        |
| -------------------------------- | -------------------------------------------------------------------------- |
| Identidade                       | `GET /v1/users/me`, `GET /v1/companies/{id}`                               |
| Login                            | `POST /v1/auth/login` (JWT no header Authorization)                        |
| Clientes                         | `GET /v1/companies/summaries`                                              |
| Histórico administrativo         | `GET /v1/transfers`, `GET /v1/transfers/{id}`                              |
| Beneficiários empresariais       | `/v1/companies/{companyId}/beneficiaries[/{id}]`                           |
| Beneficiários administrativos    | `/v1/beneficiaries[/{id}]`                                                 |
| Cotação/criação                  | `POST /v1/transfers/quote`, `POST /v1/transfers`                           |
| Detalhes/comprovante empresarial | `GET /api/transferencias/{id}`, `GET /api/transferencias/{id}/comprovante` |
| Onboarding e compliance          | `/v1/onboarding/...`                                                       |

Adapters de feature validam respostas com Zod e traduzem paginação base 0 do backend para base 1 da UI. Valores decimais do histórico e detalhes permanecem strings; ausência não é convertida em zero. O transporte central trata JSON, respostas vazias, cancelamento, binários e erros `{message, code}`; erros antigos sem code continuam aceitos. Uploads pré-assinados usam transporte separado, sem token da aplicação.

## Verificação

```bash
npm run audit
npm run format:check
npm run lint
npm run test:coverage
npm run build
```

A cobertura agregada mínima é 80% para statements, branches, funções e linhas. Testes usam Vitest e React Testing Library, sem rede real nem providers financeiros reais. Alterações de comportamento devem incluir seus testes.

## Deploy na AWS

O workflow [deploy.yml](.github/workflows/deploy.yml) publica `main` em **staging** e uma GitHub Release estável em **production**, desde que o commit da release pertença a `main`. Ele executa as verificações do CI, constrói a SPA com a origem da API do ambiente e publica em S3/CloudFront.

Crie os GitHub Environments `staging` e `production` e configure, em cada um, as seguintes **variables** com os outputs do Terraform correspondente:

| Variable                   | Output do Terraform        |
| -------------------------- | -------------------------- |
| `AWS_ROLE_ARN`             | `frontend_deploy_role_arn` |
| `FRONTEND_BUCKET`          | `frontend_bucket_name`     |
| `FRONTEND_DISTRIBUTION_ID` | `frontend_distribution_id` |
| `VITE_API_URL`             | `api_url`                  |

O role é assumido por OIDC na região `us-east-2`. O deploy preserva assets antigos com nomes versionados, publica `index.html` por último e aguarda a invalidação do CloudFront. O `VITE_API_URL` é incorporado ao build e deve ser apenas a origem do backend.
