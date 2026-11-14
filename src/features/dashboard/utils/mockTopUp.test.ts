import { describe, expect, it } from 'vitest'
import { normalizeMockTopUp, projectedMockBalance } from './mockTopUp'

describe('normalizeMockTopUp', () => {
  it.each([
    ['10,25', '10.25'],
    ['R$ 10,25', '10.25'],
    ['1.234,56', '1234.56'],
    ['R$ 1.234.567,89', '1234567.89'],
    ['10', '10.00'],
    ['0,01', '0.01'],
    ['000010,2', '10.20'],
    ['9999999999999,99', '9999999999999.99'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeMockTopUp(input)).toBe(expected)
  })

  it.each([
    '',
    'R('rejects invalid amount %s', (input) => {
    expect(normalizeMockTopUp(input)).toBeNull()
  })
})

describe('projectedMockBalance', () => {
  it('sums decimal cents exactly', () => {
    expect(projectedMockBalance('0.00', '10.25')).toBe('10.25')
    expect(projectedMockBalance('10.25', '2.50')).toBe('12.75')
  })

  it('does not lose cents near the technical limit', () => {
    expect(projectedMockBalance('9999999999999.98', '0.01')).toBe('9999999999999.99')
    expect(projectedMockBalance('9999999999999.99', '0.01')).toBeNull()
  })

  it('rejects malformed API values and zero credits', () => {
    expect(projectedMockBalance('nope', '1.00')).toBeNull()
    expect(projectedMockBalance('1.00', '0.00')).toBeNull()
  })
})
,
    '0',
    '0,00',
    '-1',
    'abc',
    '1,234',
    '1.23',
    '1.23,45',
    '12.34,56',
    '12,345',
    '10000000000000',
    '10000000000000,00',
  ])('rejects invalid amount %s', (input) => {
    expect(normalizeMockTopUp(input)).toBeNull()
  })
})

describe('projectedMockBalance', () => {
  it('sums decimal cents exactly', () => {
    expect(projectedMockBalance('0.00', '10.25')).toBe('10.25')
    expect(projectedMockBalance('10.25', '2.50')).toBe('12.75')
  })

  it('does not lose cents near the technical limit', () => {
    expect(projectedMockBalance('9999999999999.98', '0.01')).toBe('9999999999999.99')
    expect(projectedMockBalance('9999999999999.99', '0.01')).toBeNull()
  })

  it('rejects malformed API values and zero credits', () => {
    expect(projectedMockBalance('nope', '1.00')).toBeNull()
    expect(projectedMockBalance('1.00', '0.00')).toBeNull()
  })
})
