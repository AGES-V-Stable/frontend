import { describe, expect, it } from 'vitest'

import { mockBeneficiary } from './mockBeneficiary'

describe('mockBeneficiary', () => {
  it('contains beneficiaries with the expected read-only fields', () => {
    expect(mockBeneficiary).toHaveLength(2)

    for (const beneficiary of mockBeneficiary) {
      expect(beneficiary).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          nickname: expect.any(String),
          companyId: expect.any(String),
          identificationDocument: expect.any(String),
          country: expect.any(String),
          address: expect.any(String),
          legalName: expect.any(String),
          currency: expect.any(String),
          receivingMethod: expect.any(String),
        }),
      )
      expect(beneficiary.identificationDocument).toMatch(/^\d{14}$/)
    }
  })

  it('provides distinct companies, countries and currencies for filter options', () => {
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.companyId)).size).toBe(1)
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.country))).toEqual(
      new Set(['Brasil', 'Estados Unidos']),
    )
    expect(new Set(mockBeneficiary.map((beneficiary) => beneficiary.currency))).toEqual(
      new Set(['BRL', 'USD']),
    )
  })
})