import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AdminNavIcon, Sidebar } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { getCurrentUser } from '@/services/user'

interface ClientLayoutProps {
  children: ReactNode
  activeItemId?: 'home' | 'beneficiaries' | 'transfers' | 'settings'
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

const menuItems = [
  { id: 'home' as const, label: 'Início', path: PATHS.HOME },
  { id: 'beneficiaries' as const, label: 'Beneficiários', path: PATHS.BENEFICIARIES },
  { id: 'transfers' as const, label: 'Transferências', path: '/transferencias' },
  { id: 'settings' as const, label: 'Configurações', path: '/settings' },
]

export function ClientLayout({ children, activeItemId = 'beneficiaries' }: ClientLayoutProps) {
  const navigate = useNavigate()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const user = await getCurrentUser(controller.signal)
        setUserName(user.name)
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

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        className="sticky top-0"
        logo={
          <span className="text-lg font-bold text-primary">
            V-<span className="text-slate-900">Stable</span>
          </span>
        }
        items={menuItems.map((item) => ({
          ...item,
          icon: <AdminNavIcon id={item.id} />,
          onClick: () => navigate(item.path),
        }))}
        activeItemId={activeItemId}
        account={{
          name: userName ?? '',
          description: 'Conta empresarial',
          initials: userName ? initialsOf(userName) : '',
        }}
      />
      <div className="flex min-h-screen w-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-sage-200 bg-white px-6">
          <span className="text-sm font-medium text-slate-900">V-Stable • Conta empresarial</span>
          {loading && (
            <span role="status" className="text-sm text-slate-500">
              Carregando...
            </span>
          )}
          {!loading && error && (
            <span role="alert" className="text-sm text-red-700">
              {error}
            </span>
          )}
          {!loading && !error && userName && (
            <span className="text-sm font-medium text-slate-900">{userName}</span>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}