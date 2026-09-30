export const formatCurrency = (value: number, currencyCode: string) => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currencyCode} ${formatter.format(value)}`
}

/**
 * Formata um valor monetário com o símbolo da moeda (R$ 125.000,00, US$ 24.235,14).
 * Apenas exibição: nenhum arredondamento de negócio. Código de moeda que o Intl não
 * reconhece cai no formato "CÓDIGO 1.234,56".
 */
export const formatMoney = (value: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(
      value,
    )
  } catch {
    return formatCurrency(value, currencyCode)
  }
}

/** Formata um número com duas casas no padrão pt-BR, sem moeda (24235.14 → 24.235,14). */
export const formatDecimal = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  )

/**
 * Converte o texto digitado em um campo de valor pt-BR ("125.000,50") para número.
 * Devolve null quando o texto não representa um valor com até duas casas decimais.
 */
export const parseDecimalInput = (text: string): number | null => {
  const normalized = text.trim().replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Number(normalized)
}

/** Formata um percentual já expresso em pontos percentuais (0.45 → 0,45%). */
export const formatPercent = (value: number) =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`

export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  if (isNaN(date.getTime())) return dateString

  return `${day} ${month} ${year}`
}
