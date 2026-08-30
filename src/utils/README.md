# utils

Funções auxiliares puras: entram argumentos, sai um valor, sem efeito colateral.

- Exemplos: formatação de data e moeda, validação de CPF, máscaras de input.
- Nada de React aqui — se a função precisa de `useState` ou `useEffect`, é um hook, não um util.
- Agrupe por assunto (`format.ts`, `validation.ts`) em vez de criar um `helpers.ts` genérico.
