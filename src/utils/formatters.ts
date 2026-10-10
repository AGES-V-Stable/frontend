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

/** Símbolo da moeda no padrão pt-BR (BRL → R$, USD → US$, EUR → €); moeda desconhecida devolve o código. */
export const currencySymbol = (currencyCode: string) => {
  try {
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode })
    return (
      formatter.formatToParts(0).find((part) => part.type === 'currency')?.value ?? currencyCode
    )
  } catch {
    return currencyCode
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

const SHORT_MONTHS = [
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

export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = SHORT_MONTHS[date.getMonth()]
  const year = date.getFullYear()

  if (isNaN(date.getTime())) return dateString

  return `${day} ${month} ${year}`
}

/**
 * Formata um valor monetário recebido como string decimal ("125000.00"). Devolve null quando o
 * valor não existe ou não é numérico, para a tela mostrar "indisponível" em vez de inventar zero.
 */
export const formatMoneyString = (amount: string | null, currencyCode: string): string | null => {
  if (amount === null) return null
  const value = Number(amount)
  return Number.isFinite(value) ? formatMoney(value, currencyCode) : null
}

/** Formata um percentual recebido como string em pontos percentuais ("0.45" → 0,45%). */
export const formatPercentString = (value: string | null): string | null => {
  if (value === null) return null
  const number = Number(value)
  return Number.isFinite(number) ? formatPercent(number) : null
}

/**
 * Data e hora no padrão da tela de detalhes ("24 ago 2026 • 14:32"), no fuso informado
 * (America/Sao_Paulo por padrão). Texto que não é uma data volta como veio.
 */
export const formatDateTime = (isoDate: string, timeZone = 'America/Sao_Paulo'): string => {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''

  const month = SHORT_MONTHS[Number(part('month')) - 1] ?? ''
  return `${part('day')} ${month} ${part('year')} • ${part('hour')}:${part('minute')}`
}
