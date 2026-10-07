import { useEffect, useState, type ReactNode } from 'react'

import { getCompany } from '@/shared/services/company'
import { getStoredUserType } from '@/shared/services/session'
import { getCurrentUser } from '@/shared/services/user'
import { AccountContext, type AccountState } from './accountContext'

export function AccountProvider({ children }: { children: ReactNode }) {
  const userType = getStoredUserType()
  const [account, setAccount] = useState<AccountState>({
    user: null,
    company: null,
    loading: userType === 'pme',
    error: '',
  })

  useEffect(() => {
    if (userType === 'admin') return
    const controller = new AbortController()
    async function load() {
      let user: AccountState['user'] = null
      try {
        user = await getCurrentUser(controller.signal)
        if (controller.signal.aborted) return
        setAccount({ user, company: null, loading: true, error: '' })
        const company = user.companyId ? await getCompany(user.companyId, controller.signal) : null
        if (!controller.signal.aborted) setAccount({ user, company, loading: false, error: '' })
      } catch {
        if (!controller.signal.aborted)
          setAccount({
            user,
            company: null,
            loading: false,
            error: user
              ? 'Não foi possível carregar os dados da empresa.'
              : 'Não foi possível carregar os dados do usuário.',
          })
      }
    }
    void load()
    return () => controller.abort()
  }, [userType])

  return <AccountContext value={account}>{children}</AccountContext>
}
