import { PATHS } from '@/app/routes/paths'
import type { UserType } from '@/shared/services/session'

import type { NavBarItem } from './types'

const home: NavBarItem = { id: 'home', label: 'Início', icon: 'home', path: PATHS.HOME }

const adminItems: NavBarItem[] = [
  home,
  { id: 'clients', label: 'Clientes PME', icon: 'beneficiaries', path: PATHS.ADMIN_CLIENTS },
  {
    id: 'audit',
    label: 'Auditoria',
    icon: 'transfers',
    path: PATHS.ADMIN_AUDIT,
    activePaths: [PATHS.ADMIN_BENEFICIARIES, PATHS.ADMIN_TRANSFERS],
  },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
]

const pmeItems: NavBarItem[] = [
  home,
  { id: 'beneficiaries', label: 'Beneficiários', icon: 'beneficiaries', path: PATHS.BENEFICIARIES },
  { id: 'transfers', label: 'Transferências', icon: 'transfers' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
]

export function getNavigationItems(userType: UserType): NavBarItem[] {
  return userType === 'admin' ? adminItems : pmeItems
}

export function isNavigationItemActive(path: string, pathname: string): boolean {
  const currentPath =
    pathname === PATHS.DEMO_HOME ? PATHS.HOME : pathname.replace(/^\/demo(?=\/admin\/)/, '')

  return currentPath === path || (path !== PATHS.HOME && currentPath.startsWith(`${path}/`))
}
