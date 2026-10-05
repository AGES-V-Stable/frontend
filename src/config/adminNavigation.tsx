import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { AdminNavIcon, type AdminNavIconId } from '@/components/Sidebar'
import { PATHS } from '@/routes/paths'
import { getSessionClaims } from '@/services/authToken'
import { logout } from '@/services/session'

interface AdminNavItem {
  id: AdminNavIconId
  label: string
  path: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'home', label: 'Clientes PME', path: PATHS.ADMIN_CLIENTS },
  { id: 'beneficiaries', label: 'Beneficiários', path: PATHS.ADMIN_BENEFICIARIES },
  { id: 'transfers', label: 'Transferências', path: PATHS.ADMIN_TRANSFERS },
]

function initialsOf(text: string) {
  return text.replace(/@.*/, '').slice(0, 2).toUpperCase()
}

/** Props comuns do Sidebar das telas administrativas (itens, item ativo, conta e logout). */
export function useAdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return useMemo(() => {
    const email = getSessionClaims()?.email
    const items = [
      ...ADMIN_NAV_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
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
    ]

    return {
      items,
      activeItemId: ADMIN_NAV_ITEMS.find((item) => item.path === location.pathname)?.id ?? 'home',
      account: {
        name: email ?? 'V-Stable Admin',
        description: 'Operações & Compliance',
        initials: email ? initialsOf(email) : 'VS',
      },
    }
  }, [location.pathname, navigate])
}
