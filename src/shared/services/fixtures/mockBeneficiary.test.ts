import { describe, expect, it } from 'vitest'

import { mockBeneficiary } from './mockBeneficiary'

describe('mockBeneficiary', () => {
  it('contains beneficiaries with the expected read-only fields', () => {
    expect(mockBeneficiary).toHaveLength(2)

    for (const beneficiary of mockBeneficiary) {
      expect(beneficiary).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          nome: expect.any(String),
          empresa: expect.any(String),
          cnpj: expect.any(String),
          country: expect.any(String),
          currency: expect.any(String),
          status: expect.any(String),
        }),
      )
      expect(beneficiary).not.toHaveProperty('cpf')
      expect(beneficiary.cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
    }
  })

  it('provides distinct companies, countries and currencies for filter options', () => {
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.empresa)).size).toBe(2)
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.country))).toEqual(
      new Set(['Brasil', 'Estados Unidos']),
    )
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.currency))).toEqual(
      new Set(['BRL', 'USD']),
    )
  })
})
