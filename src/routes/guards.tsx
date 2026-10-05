import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { UNAUTHORIZED_EVENT } from '@/services/api'
import { getSessionClaims, isAdminSession } from '@/services/authToken'

import { PATHS } from './paths'

export interface LoginRedirectState {
  from?: string
  reason?: 'expired'
}

function useReturnPath() {
  const location = useLocation()
  return `${location.pathname}${location.search}`
}

/** Exige uma sessão válida (token presente e não expirado). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const from = useReturnPath()
  if (!getSessionClaims()) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from } satisfies LoginRedirectState} />
  }
  return <>{children}</>
}

/**
 * Exige uma sessão de administrador. A navegação é só conveniência: a
 * autorização real é feita pelo backend em cada endpoint.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const from = useReturnPath()
  const claims = getSessionClaims()
  if (!claims) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from } satisfies LoginRedirectState} />
  }
  if (!isAdminSession(claims)) {
    return <Navigate to={PATHS.BENEFICIARIES} replace />
  }
  return <>{children}</>
}

/** Quando uma chamada protegida recebe 401, a sessão já foi limpa: volta para o login. */
export function UnauthorizedRedirect() {
  const navigate = useNavigate()
  const from = useReturnPath()

  useEffect(() => {
    const onUnauthorized = () => {
      void navigate(PATHS.LOGIN, {
        replace: true,
        state: { from, reason: 'expired' } satisfies LoginRedirectState,
      })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [navigate, from])

  return null
}
