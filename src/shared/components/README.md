# components

Componentes de UI reutilizáveis, usados por mais de uma tela.

- Sem regra de negócio e sem chamada de API: o componente recebe dados e callbacks por props e devolve JSX.
- Um arquivo por componente, em PascalCase (`Button.tsx`, `InputText.tsx`).
- Se um componente pertence a uma feature específica, mantenha-o no diretório `components/` dessa feature, próximo das páginas que o utilizam.
