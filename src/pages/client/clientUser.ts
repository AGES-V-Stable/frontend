import { createContext, useContext } from 'react'

import type { CurrentUser } from '@/services/user'

export interface ClientUserState {
  user: CurrentUser | null
  loading: boolean
  error?: string
}

export const ClientUserContext = createContext<ClientUserState>({ user: null, loading: true })

/** Usuário logado carregado pelo ClientLayout (evita buscar /users/me de novo em cada tela). */
export function useClientUser(): ClientUserState {
  return useContext(ClientUserContext)
}
