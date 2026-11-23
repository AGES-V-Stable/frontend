import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlindPayTermsReturn } from './BlindPayTermsReturn'
import { termsReturnDestination } from '@/app/termsReturnDestination'

const state = '00000000-0000-4000-8000-000000000001'

describe('BlindPay terms return', () => {
  it('returns to the configured app origin with only the acceptance and session values', () => {
    const result = termsReturnDestination(
      `?state=${state}&tos_id=to_000000000001&redirect=https://untrusted.example`,
      'https://app.example',
    )
    expect(result).toBe(`https://app.example/kyc/blindpay?state=${state}&tos_id=to_000000000001`)
  })

  it.each([
    '?tos_id=to_000000000001',
    `?state=${state}&tos_id=invalid`,
    '?state=invalid&tos_id=to_000000000001',
  ])('rejects an invalid or missing session: %s', (search) => {
    expect(termsReturnDestination(search, 'https://app.example')).toBeNull()
  })

  it('rejects an unsafe configured origin', () => {
    expect(
      termsReturnDestination(`?state=${state}&tos_id=to_000000000001`, 'javascript:alert(1)'),
    ).toBeNull()
  })

  it('shows an error without navigating when callback parameters are absent', () => {
    render(<BlindPayTermsReturn />)
    expect(screen.getByRole('alert')).toHaveTextContent('Retorno inválido')
  })
})
