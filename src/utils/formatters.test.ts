import { describe, expect, it } from 'vitest'

import {
  currencySymbol,
  formatDecimal,
  formatMoney,
  formatPercent,
  parseDecimalInput,
} from './formatters'

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
