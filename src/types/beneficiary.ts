/** Espelha BeneficiaryResponse do backend. Campos opcionais do banco vêm como null no JSON. */
export interface Beneficiary {
  id: string
  companyId: string
  beneficiaryType: string
  legalName: string | null
  nickname: string
  internalDescription?: string | null
  receivingMethod: 'BANK_ACCOUNT' | 'PIX_KEY' | 'CRYPTO_WALLET'
  pixKey?: string | null
  identificationDocument?: string | null
  accountHolderName?: string | null
  address?: string | null
  bankName?: string | null
  swiftBic?: string | null
  bankCode?: string | null
  branchNumber?: string | null
  accountNumber?: string | null
  accountType?: 'checking' | 'payment' | 'savings' | 'salary' | null
  currency?: string | null
  country?: string | null
  blockchainNetwork?: 'ethereum' | 'polygon' | 'celo' | 'gnosis' | 'moonbeam' | 'tron' | null
  walletAddress?: string | null
  walletMemo?: string | null
  createdAt: string
  updatedAt: string | null
}

/** Página do Spring Data (number é base 0). */
export interface PaginatedBeneficiaries {
  content: Beneficiary[]
  totalElements: number
  totalPages: number
  number: number // current page (0-indexed)
  size: number
}
