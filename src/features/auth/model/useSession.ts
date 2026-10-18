import { createContext, useContext } from 'react'
import type { Company, User } from '../api/user'
export type Session = {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error'
  user: User | null
  company: Company | null
  error: string | null
  retry: () => void
}
export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession requires SessionProvider')
  return session
}
