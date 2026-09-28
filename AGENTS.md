# AGENTS.md

Instruções para agentes que alteram o frontend V-Stable. Use este arquivo como mapa; confirme detalhes no código e nos arquivos de configuração antes de mudar comportamento.

## Projeto e arquitetura

- Stack: React, TypeScript, Vite, React Router, Tailwind CSS e Zod. Node.js 24 é a versão usada no CI.
- `src/pages/` compõe telas; `src/components/` contém componentes reutilizáveis; `src/services/` concentra chamadas à API; `src/routes/` define rotas; `src/schemas/` e `src/types/` descrevem validações e contratos; `src/utils/` contém funções compartilhadas.
- Preserve essas responsabilidades e siga o padrão mais próximo já usado. Não mova regras de negócio para componentes de apresentação nem crie uma camada nova para uso único.
- Antes de alterar contratos ou fluxos, localize seus consumidores e testes. Mantenha compatibilidade com a API existente, salvo quando a tarefa pedir uma mudança de contrato.

## Regras de implementação

- Prefira soluções simples e locais. Aplique Clean Code, GRASP, KISS e YAGNI na prática: nomes claros, responsabilidade coesa e nenhuma abstração especulativa.
- Trate dados vindos de formulários e da API como entrada não confiável. Reutilize as validações e os padrões de erro existentes; não contorne validações para fazer um fluxo passar.
- Não registre nem exponha tokens, credenciais, dados pessoais, documentos de compliance ou dados de beneficiários. Não coloque segredos em código, testes, logs ou arquivos versionados; use a configuração por ambiente existente.
- Evite `any`, coerções inseguras, `dangerouslySetInnerHTML` e dependências novas sem necessidade demonstrável.
- Não altere arquivos gerados nem arquivos fora do escopo. Se mudar dependências, atualize o lockfile usado pelo CI (`package-lock.json`, pois o CI executa `npm ci`) e considere a auditoria de dependências.

## Testes

- Toda mudança que altera comportamento deve incluir ou atualizar teste da funcionalidade no mesmo PR. Não é obrigatório escrever o teste antes da implementação; é obrigatório entregar a mudança comportamental com teste.
- Use Vitest e React Testing Library. Prefira testar comportamento observável da interface e contratos de serviços; teste funções puras diretamente quando isso for mais simples.
- Estruture testes em Arrange, Act, Assert (Given, When, Then). Mantenha-os rápidos, independentes, repetíveis, auto-validáveis e abrangentes; use descrições que expliquem o cenário e o resultado.
- Não use snapshots como substituto de verificações de comportamento. Evite dependência de rede real, temporização arbitrária e mocks de detalhes internos que não fazem parte do contrato.
- A configuração atual exige cobertura agregada mínima de 80% para linhas, funções, branches e statements em `npm run test:coverage`. Ela não é um limite de 80% por arquivo; não amplie exclusões de cobertura apenas para passar no gate.

## Validação

Execute as verificações adequadas à mudança. Para uma alteração de código, use o conjunto do CI:

```bash
npm run audit
npm run format:check
npm run lint
npm run test:coverage
npm run build
```

O CI executa essas verificações em pull requests para `main` e em pushes para `main`. `npm run format` formata o repositório inteiro; evite usá-lo para uma mudança localizada se isso alterar arquivos fora do escopo. Se uma verificação não puder ser executada, informe qual e por quê, sem afirmar que passou.
