# services

Comunicação compartilhada com o backend. Chamadas HTTP ficam em serviços, nunca soltas dentro de componentes ou páginas. Serviços exclusivos de login, compliance ou admin ficam no diretório `services/` da respectiva feature.

- Um arquivo por recurso da API (`auth.ts`, `users.ts`), exportando funções nomeadas.
- As funções devolvem dados já tipados; os contratos compartilhados ficam em `src/shared/types/`.
- Os serviços de beneficiários e usuário ficam aqui porque atendem mais de uma feature. `apiClient.ts` mantém o contrato do cliente HTTP anteriormente chamado `registration.ts`.
- A URL base e a configuração do cliente HTTP ficam centralizadas, para não repetir endereço em cada arquivo.
