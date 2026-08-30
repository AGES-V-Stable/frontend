# services

Comunicação com o backend. Toda chamada HTTP mora aqui — nenhum `fetch` solto dentro de componente ou página.

- Um arquivo por recurso da API (`auth.ts`, `users.ts`), exportando funções nomeadas.
- As funções devolvem dados já tipados; os tipos ficam em `src/types/`.
- A URL base e a configuração do cliente HTTP ficam centralizadas, para não repetir endereço em cada arquivo.
