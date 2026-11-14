/** Decimal conversion uses integer cents end-to-end; floats are never used for balances. */
const MAX_CENTS = 999_999_999_999_999n // numeric(15,2), not a business cap

function toCents(value: string): bigint | null {
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return result <= MAX_CENTS ? result : null
}

function fromCents(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`
}

/**
 * Accepts pt-BR amounts with optional R$ and valid thousand separators.
 * Returns a positive decimal string with exactly two places, without rounding.
 */
export function normalizeMockTopUp(text: string): string | null {
  const raw = text.trim().replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) return null
  const [digits, fractional = ''] = raw.split(',')
  const integer = digits.replaceAll('.', '').replace(/^0+(?=\d)/, '')
  if (integer.length > 13) return null
  const cents = toCents(`${integer}.${fractional.padEnd(2, '0')}`)
  return cents !== null && cents > 0n ? fromCents(cents) : null
}

/** Computes the prospective BRL balance, or null if the database precision would overflow. */
export function projectedMockBalance(balance: string, credit: string): string | null {
  const current = toCents(balance)
  const added = toCents(credit)
  if (current === null || added === null || added <= 0n) return null
  const projected = current + added
  return projected > MAX_CENTS ? null : fromCents(projected)
}
