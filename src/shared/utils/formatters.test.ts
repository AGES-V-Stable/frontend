import { describe, expect, it } from 'vitest'

import {
  currencySymbol,
  formatDateTime,
  formatLocalDateTime,
  formatDecimal,
  formatMoney,
  formatMoneyString,
  formatRateString,
  formatPercent,
  formatPercentString,
  parseDecimalInput,
} from '@/shared/utils/formatters'

// O Intl separa símbolo e valor com espaço não separável (U+00A0).
const normalizeSpaces = (text: string) => text.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it.each([
    [125000, 'BRL', 'R$ 125.000,00'],
    [24235.14, 'USD', 'US$ 24.235,14'],
    [5.16, 'BRL', 'R$ 5,16'],
    [562.5, 'BRL', 'R$ 562,50'],
  ])('formata %s %s como %s', (value, currency, expected) => {
    expect(normalizeSpaces(formatMoney(value, currency))).toBe(expected)
  })

  it('usa o código da moeda quando o Intl não reconhece o código', () => {
    expect(formatMoney(10, 'INVALID')).toBe('INVALID 10,00')
  })
})

describe('currencySymbol', () => {
  it.each([
    ['BRL', 'R$'],
    ['USD', 'US$'],
    ['EUR', '€'],
  ])('devolve o símbolo de %s', (code, symbol) => {
    expect(currencySymbol(code)).toBe(symbol)
  })

  it('devolve o próprio código quando o Intl não reconhece a moeda', () => {
    expect(currencySymbol('??')).toBe('??')
  })
})

describe('formatPercent', () => {
  it.each([
    [0.45, '0,45%'],
    [1.1, '1,10%'],
    [0, '0,00%'],
  ])('formata %s como %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })
})

describe('formatDecimal', () => {
  it('formata com separadores pt-BR e duas casas, sem moeda', () => {
    expect(formatDecimal(24235.14)).toBe('24.235,14')
    expect(formatDecimal(125000)).toBe('125.000,00')
  })
})

describe('parseDecimalInput', () => {
  it.each([
    ['125000', 125000],
    ['125.000,00', 125000],
    ['24235,14', 24235.14],
    [' 0,5 ', 0.5],
  ])('converte "%s" em %s', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected)
  })

  it.each(['', 'abc', '10,123', '-5', '1,2,3'])('devolve null para "%s"', (text) => {
    expect(parseDecimalInput(text)).toBeNull()
  })
})

describe('formatMoneyString', () => {
  it.each([
    ['125000.00', 'BRL', 'R$ 125.000,00'],
    ['23062.73', 'USD', 'US$ 23.062,73'],
    ['0.00', 'BRL', 'R$ 0,00'],
  ])('formata "%s" em %s', (amount, currency, expected) => {
    expect(normalizeSpaces(formatMoneyString(amount, currency) ?? '')).toBe(expected)
  })

  it('devolve null para ausente ou não numérico, sem virar zero', () => {
    expect(formatMoneyString(null, 'BRL')).toBeNull()
    expect(formatMoneyString('abc', 'BRL')).toBeNull()
  })
})

describe('formatPercentString', () => {
  it('formata pontos percentuais em string', () => {
    expect(formatPercentString('0.45')).toBe('0,45%')
    expect(formatPercentString('1.10')).toBe('1,10%')
  })

  it('devolve null para ausente ou inválido', () => {
    expect(formatPercentString(null)).toBeNull()
    expect(formatPercentString('x')).toBeNull()
  })
})

describe('formatDateTime', () => {
  it('formata data e hora no fuso de São Paulo', () => {
    expect(formatDateTime('2026-08-24T14:32:00-03:00')).toBe('24 ago 2026 • 14:32')
    expect(formatDateTime('2026-10-02T02:05:00Z')).toBe('01 out 2026 • 23:05')
  })

  it('respeita o fuso pedido', () => {
    expect(formatDateTime('2026-08-24T14:32:00-03:00', 'UTC')).toBe('24 ago 2026 • 17:32')
  })

  it('devolve o texto original quando não é uma data', () => {
    expect(formatDateTime('ontem')).toBe('ontem')
  })
})

it('preserves decimal-string precision beyond the safe integer range', () => {
  expect(normalizeSpaces(formatMoneyString('12345678901234567890.67', 'USD') ?? '')).toBe(
    'US$ 12.345.678.901.234.567.890,67',
  )
  expect(formatPercentString('0.005')).toBe('0,01%')
})

describe('formatRateString', () => {
  it.each([
    ['5.47000000', 'BRL', 'R$ 5,4700'],
    ['5.47004999', 'BRL', 'R$ 5,4700'],
    ['5.47005', 'BRL', 'R$ 5,4701'],
    ['1234.5', 'BRL', 'R$ 1.234,5000'],
    ['1.0001', 'BRLA', 'BRLA 1,0001'],
  ])('formats %s %s as %s from the decimal string', (rate, currency, expected) => {
    expect(normalizeSpaces(formatRateString(rate, currency) ?? '')).toBe(expected)
  })

  it('accepts a different number of decimal places', () => {
    expect(normalizeSpaces(formatRateString('5.4789', 'BRL', 2) ?? '')).toBe('R$ 5,48')
  })

  it('returns null for a value that is not a decimal string', () => {
    expect(formatRateString('abc', 'BRL')).toBeNull()
    expect(formatRateString('abc', 'BRLA')).toBeNull()
  })
})

describe('formatLocalDateTime', () => {
  it('formats as dd/mm/aaaa hh:mm in the given time zone', () => {
    expect(formatLocalDateTime('2026-11-12T22:45:00Z', 'America/Sao_Paulo')).toBe(
      '12/11/2026 19:45',
    )
    expect(formatLocalDateTime('2026-11-12T22:45:00Z', 'UTC')).toBe('12/11/2026 22:45')
    expect(formatLocalDateTime('2026-11-12T23:30:00-03:00', 'UTC')).toBe('13/11/2026 02:30')
  })

  it('uses the browser time zone by default', () => {
    const local = new Date('2026-11-12T22:45:00Z')
    const pad = (value: number) => String(value).padStart(2, '0')
    expect(formatLocalDateTime('2026-11-12T22:45:00Z')).toBe(
      `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ${pad(local.getHours())}:${pad(local.getMinutes())}`,
    )
  })

  it('returns a text that is not a date unchanged', () => {
    expect(formatLocalDateTime('ontem')).toBe('ontem')
  })
})
