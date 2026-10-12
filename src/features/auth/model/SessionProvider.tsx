import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { clearLoginToken, getLoginToken, SESSION_CHANGED } from '@/shared/http/authToken'
import { getCompanyProfile, getCurrentUser } from '../api/user'

import { SessionContext } from './useSession'
import type { Session } from './useSession'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  const [session, setSession] = useState<Omit<Session, 'retry'>>({
    status: getLoginToken() ? 'loading' : 'anonymous',
    user: null,
    company: null,
    error: null,
  })
  useEffect(() => {
    const listener = () => {
      setSession({
        status: getLoginToken() ? 'loading' : 'anonymous',
        user: null,
        company: null,
        error: null,
      })
      retry()
    }
    const storage = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === null) listener()
    }
    window.addEventListener(SESSION_CHANGED, listener)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener(SESSION_CHANGED, listener)
      window.removeEventListener('storage', storage)
    }
  }, [retry])
  useEffect(() => {
    const token = getLoginToken()
    const controller = new AbortController()
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession({ status: 'anonymous', user: null, company: null, error: null })
      return
    }
    setSession({ status: 'loading', user: null, company: null, error: null })
    const load = async () => {
      try {
        const user = await getCurrentUser(controller.signal)
        const company =
          user.accountType === 'USER' && user.companyId
            ? await getCompanyProfile(user.companyId, controller.signal)
            : null
        if (!controller.signal.aborted && getLoginToken() === token)
          setSession({ status: 'authenticated', user, company, error: null })
      } catch (error) {
        if (controller.signal.aborted || getLoginToken() !== token) return
        if (error instanceof ApiError && error.status === 401) {
          clearLoginToken()
          return
        }
        setSession({
          status: 'error',
          user: null,
          company: null,
          error: 'Não foi possível carregar os dados da conta.',
        })
      }
    }
    void load()
    return () => controller.abort()
  }, [revision])
  return <SessionContext.Provider value={{ ...session, retry }}>{children}</SessionContext.Provider>
}
