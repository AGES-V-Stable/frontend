export interface Beneficiary {
  id: string
  companyId: string
  nickname: string
  identificationDocument: string
  country: string
  address: string
  receivingMethod: string
  legalName: string
  accountType?: string
  accountHolderName?: string
  accountNumber?: string
  bankCode?: string
  branchNumber?: string
  currency?: string
  swiftBic?: string
  pixKey?: string
  walletAddress?: string
  blockchainNetwork?: string
  walletMemo?: string
  createdAt: string
  updatedAt: string
}

export interface BeneficiariesPage {
  content: Beneficiary[]
  totalElements: number
  totalPages: number
}

export type PaginatedBeneficiaries = BeneficiariesPage & {
  number: number
  size: number
}
