import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { getLoginToken, invalidateToken, SESSION_CHANGED } from '@/shared/http/authToken'
import { getCompanyProfile, getCurrentUser } from '../api/user'

import { isStoredAdmin } from './storedAccount'
import { SessionContext } from './useSession'
import type { Session } from './useSession'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const [session, setSession] = useState<Omit<Session, 'retry'>>({
    status: getLoginToken() ? 'loading' : 'anonymous',
    user: null,
    company: null,
    error: null,
  })
  /**
   * Recarrega usuário e empresa. O estado passa a `loading` na mesma renderização, para que
   * guards não decidam com o contexto anterior (por exemplo, logo após aceitar um convite).
   */
  const retry = useCallback(() => {
    setSession({
      status: getLoginToken() ? 'loading' : 'anonymous',
      user: null,
      company: null,
      error: null,
    })
    setRevision((value) => value + 1)
  }, [])
  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === null) retry()
    }
    window.addEventListener(SESSION_CHANGED, retry)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener(SESSION_CHANGED, retry)
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
          !isStoredAdmin() && user.companyId
            ? await getCompanyProfile(user.companyId, controller.signal)
            : null
        if (!controller.signal.aborted && getLoginToken() === token)
          setSession({ status: 'authenticated', user, company, error: null })
      } catch (error) {
        if (controller.signal.aborted || getLoginToken() !== token) return
        if (error instanceof ApiError && error.status === 401) {
          invalidateToken(token)
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
