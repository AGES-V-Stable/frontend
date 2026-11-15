import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import {
  ACCESS_DENIED,
  getLoginToken,
  invalidateToken,
  SESSION_CHANGED,
} from '@/shared/http/authToken'
import { getCompanyProfile, getCurrentUser } from '../api/user'
import type { User } from '../api/user'

import { isStoredAdmin } from './storedAccount'
import { SessionContext } from './useSession'
import type { Session } from './useSession'

/** Identifica o acesso empresarial do usuário, para detectar mudança de perfil ou de vínculo. */
function accessKey(user: User | null): string {
  const access = user?.companyAccess
  return JSON.stringify([
    user?.companyId ?? null,
    access?.membershipId ?? null,
    access?.companyId ?? null,
    access?.role ?? null,
    access?.status ?? null,
    access?.version ?? null,
    access?.permissions ?? null,
  ])
}

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
  // Atualizado no commit (e não depois da pintura), para valer assim que a tela aparece.
  const latest = useRef(session)
  useLayoutEffect(() => {
    latest.current = session
  }, [session])
  /**
   * Uma ação foi recusada por mudança de perfil ou de vínculo: consulta o contexto atual em
   * segundo plano e só troca a sessão se o acesso mudou. Sem mudança, nada é refeito, o que
   * evita repetir indefinidamente a mesma requisição recusada.
   */
  useEffect(() => {
    let inFlight = false
    const refreshAccess = async () => {
      const token = getLoginToken()
      if (!token || inFlight || isStoredAdmin()) return
      inFlight = true
      try {
        const user = await getCurrentUser()
        const current = latest.current
        if (
          getLoginToken() !== token ||
          current.status !== 'authenticated' ||
          accessKey(user) === accessKey(current.user)
        )
          return
        const company =
          user.companyId && user.companyId === current.user?.companyId
            ? current.company
            : user.companyId
              ? await getCompanyProfile(user.companyId)
              : null
        if (getLoginToken() === token)
          setSession({ status: 'authenticated', user, company, error: null })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) invalidateToken(token)
        // Demais falhas: a sessão atual é mantida; o backend segue recusando o que não é permitido.
      } finally {
        inFlight = false
      }
    }
    const listener = () => void refreshAccess()
    window.addEventListener(ACCESS_DENIED, listener)
    return () => window.removeEventListener(ACCESS_DENIED, listener)
  }, [])
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
