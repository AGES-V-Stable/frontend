export interface Beneficiary {
  id: string
  companyId: string
  nickname: string
  internalDescription?: string
  receivingMethod: 'BANK_ACCOUNT' | 'PIX_KEY' | 'CRYPTO_WALLET'
  pixKey?: string
  identificationDocument?: string
  accountHolderName?: string
  bankCode?: string
  branchNumber?: string
  accountNumber?: string
  accountType?: 'checking' | 'payment' | 'savings' | 'salary'
  country?: string
  blockchainNetwork?: 'ethereum' | 'polygon' | 'celo' | 'gnosis' | 'moonbeam' | 'tron'
  walletAddress?: string
  walletMemo?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedBeneficiaries {
  content: Beneficiary[]
  totalElements: number
  totalPages: number
  number: number // current page (0-indexed)
  size: number
}
