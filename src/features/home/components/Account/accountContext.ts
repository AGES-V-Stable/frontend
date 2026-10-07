import { createContext } from 'react'

import type { Company } from '@/shared/services/company'
import type { CurrentUser } from '@/shared/services/user'

export interface AccountState {
  user: CurrentUser | null
  company: Company | null
  loading: boolean
  error: string
}

export const AccountContext = createContext<AccountState>({
  user: null,
  company: null,
  loading: false,
  error: '',
})
