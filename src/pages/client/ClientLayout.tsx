import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AdminNavIcon, Sidebar } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { logout } from '@/services/session'
import { getCurrentUser, type CurrentUser } from '@/services/user'

import { ClientUserContext } from './clientUser'

interface ClientLayoutProps {
  children: ReactNode
  activeItemId?: 'home' | 'beneficiaries'
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

const menuItems = [
  { id: 'home' as const, label: 'Situação cadastral', path: PATHS.REGISTER_STATUS },
  { id: 'beneficiaries' as const, label: 'Beneficiários', path: PATHS.BENEFICIARIES },
]

export function ClientLayout({ children, activeItemId = 'beneficiaries' }: ClientLayoutProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const current = await getCurrentUser(controller.signal)
        setUser(current)
        setError(undefined)
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível carregar os dados do usuário.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const userName = user?.name ?? null

  return (
    <ClientUserContext.Provider value={{ user, loading, error }}>
      <div className="flex min-h-screen bg-[#F1F5F9]">
        <Sidebar
          className="sticky top-0"
          logo={
            <span className="text-lg font-bold text-[#059669]">
              V-<span className="text-[#0F172A]">Stable</span>
            </span>
          }
          items={[
            ...menuItems.map((item) => ({
              ...item,
              icon: <AdminNavIcon id={item.id} />,
              onClick: () => navigate(item.path),
            })),
            {
              id: 'logout',
              label: 'Sair',
              icon: <AdminNavIcon id="logout" />,
              onClick: () => {
                logout()
                void navigate(PATHS.LOGIN, { replace: true })
              },
            },
          ]}
          activeItemId={activeItemId}
          account={{
            name: userName ?? '',
            description: 'Conta empresarial',
            initials: userName ? initialsOf(userName) : '',
          }}
        />
        <div className="flex min-h-screen w-full flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#ccd8d2] bg-white px-6">
            <span className="text-sm font-medium text-[#0F172A]">V-Stable • Conta empresarial</span>
            {loading && (
              <span role="status" className="text-sm text-[#64748B]">
                Carregando...
              </span>
            )}
            {!loading && error && (
              <span role="alert" className="text-sm text-red-700">
                {error}
              </span>
            )}
            {!loading && !error && userName && (
              <span className="text-sm font-medium text-[#0F172A]">{userName}</span>
            )}
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </ClientUserContext.Provider>
  )
}
