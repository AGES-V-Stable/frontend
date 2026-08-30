# components

Componentes de UI reutilizáveis, usados por mais de uma tela.

- Sem regra de negócio e sem chamada de API: o componente recebe dados e callbacks por props e devolve JSX.
- Um arquivo por componente, em PascalCase (`Button.tsx`, `InputText.tsx`).
- Se um componente só existe para uma tela específica e não vai ser reaproveitado, prefira deixá-lo junto da página em `src/pages/`.
