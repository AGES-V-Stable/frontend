# Frontend V-Stable

### Arquitetura de pastas

```text
src/
├── app/
│   ├── App.tsx
│   ├── routes/          # Rotas, caminhos e demonstrações
│   └── providers/       # StrictMode e BrowserRouter
├── features/
│   ├── login/
│   │   ├── pages/       # Login e cadastro de acesso, empresa e representante
│   │   ├── components/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── compliance/
│   │       ├── pages/   # Documentos, liveness, conclusão e status
│   │       ├── components/
│   │       ├── services/
│   │       └── schemas/
│   └── home/
│       ├── Home.tsx     # Layout que compõe NavBar e conteúdo
│       ├── components/
│       │   └── NavBar/
│       └── content/
│           ├── admin/
│           │   ├── pages/
│           │   ├── components/
│           │   └── services/
│           └── pme/
│               ├── pages/
│               ├── components/
│               └── services/
├── shared/
│   ├── components/
│   ├── services/
│   ├── types/
│   ├── schemas/
│   ├── utils/
│   ├── assets/
│   └── styles/
└── main.tsx
```

`App` seleciona as rotas de login/compliance e home. `Home` compõe a navegação central e recebe o conteúdo de cada tela: o conteúdo administrativo inclui `AdminHome`, clientes, transferências e beneficiários; a raiz seleciona `AdminHome` ou `PmeHome` conforme o role armazenado. A entrada Auditoria reúne as telas administrativas existentes. O conteúdo PME inclui o dashboard, beneficiários e cadastro, usando `ClientLayout` para os dados da conta empresarial. O saldo vem da API; métricas sem endpoint disponível exibem estados de indisponibilidade. Transferências PME, configurações e suporte ficam desabilitados até a implementação desses fluxos. A `NavBar` lê o JWT de `localStorage.token`: os roles `ADMIN` e `ROLE_ADMIN` selecionam o menu administrativo; os demais selecionam o menu PME. Menus, destinos, seleção pelo URL ficam dentro de `components/NavBar/`; o provider em `components/Account/` compartilha os dados da conta entre o cabeçalho, a navegação e o conteúdo, sem configuração nas páginas. Login direciona os usuários autenticados para a raiz, que seleciona o conteúdo pelo role.

Mantenha páginas, componentes, serviços e validações junto da feature responsável. Use `shared/` para código consumido entre features, como UI genérica, clientes HTTP, tokens, contratos e serviços de usuário e beneficiários. Os diretórios `compliance/schemas/` e `pme/services/` estão reservados para implementações locais quando necessárias; não duplicam código compartilhado.

Os testes ficam junto dos arquivos testados. O alias `@/` continua apontando para `src/`.

### Instalar dependências:

```bash
npm install
```

### Rodar o projeto em desenvolvimento:

```bash
npm run dev
```

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
