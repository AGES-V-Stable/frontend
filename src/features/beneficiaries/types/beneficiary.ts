import type { z } from 'zod'
import type { BeneficiarySchema } from '../schemas/beneficiary'
export type Beneficiary = z.infer<typeof BeneficiarySchema>

export interface BeneficiariesPage {
  content: Beneficiary[]
  totalElements: number
  totalPages: number
}

export type PaginatedBeneficiaries = BeneficiariesPage & {
  number: number
  size: number
}
