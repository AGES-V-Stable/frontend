# Frontend V-Stable

### Instalar dependências:

```bash
npm install
```

### Rodar o projeto em desenvolvimento:

```bash
npm run dev
```

### Integração com o backend:

Todas as chamadas passam por `src/services/api.ts`, que monta a URL como `<VITE_API_URL>/v1/<rota>`.

- `VITE_API_URL` é **só a origem** do backend, sem `/v1` (ex.: `https://api.vstable.com`).
- Em desenvolvimento, deixe `VITE_API_URL` vazio: o Vite faz proxy de `/v1` para `API_PROXY_TARGET` (padrão `http://localhost:8080`).
- Em produção, ou o servidor web encaminha `/v1` para o backend, ou `VITE_API_URL` aponta para a origem pública da API. Neste caso, a origem do frontend precisa estar em `CORS_ALLOWED_ORIGINS` no backend.
- O token de acesso fica em `sessionStorage` (`src/services/authToken.ts`), tanto após o login quanto após o onboarding. Uma resposta 401 numa rota protegida encerra a sessão e leva ao login.

### Checagem e formatação de código:

```bash
# Verificar formatação (Prettier)
npm run format:check

# Aplicar formatação (Prettier)
npm run format
```

### Linting:

```bash
# Executar ESLint
npm run lint

# Corrigir problemas automáticos
npm run lint:fix
```

### Testes Unitários e Cobertura:

```bash
# Executar testes unitários (Vitest)
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes gerando relatório de cobertura e validando threshold (80%)
npm run test:coverage
```

### Auditoria de Dependências (DevSecOps / AppSec):

```bash
# Verificar vulnerabilidades nas dependências
npm run audit
```

### Build de Produção:

```bash
npm run build
```
