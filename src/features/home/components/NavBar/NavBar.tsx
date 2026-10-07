import { useLocation, useNavigate } from 'react-router'

import logo from '@/shared/assets/navigation/logo.png'
import { getStoredUserType } from '@/shared/services/session'

import { AdminNavIcon } from './AdminNavIcon'
import { NavBarAccount } from './NavBarAccount'
import { getNavigationItems, isNavigationItemActive } from './navigation'
import type { NavBarProps } from './types'

export function NavBar({ className = '' }: NavBarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const userType = getStoredUserType()
  const items = getNavigationItems(userType)

  return (
    <aside
      className={`flex h-dvh w-[236px] shrink-0 flex-col border-r border-sage-300 bg-white ${className}`}
    >
      <div className="flex h-[108px] shrink-0 items-center justify-center p-6">
        <img
          src={logo}
          alt="V-Stable"
          width={149}
          height={60}
          className="h-[60px] w-[149px] object-contain"
        />
      </div>
      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto pr-3">
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const active =
              !!item.path &&
              [item.path, ...(item.activePaths || [])].some((path) =>
                isNavigationItemActive(path, pathname),
              )
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.path}
                  title={!item.path ? 'Em breve' : undefined}
                  onClick={() => item.path && navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-r-lg border-r-4 px-4 py-2 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-green-500 bg-green-200 text-green-700' : 'border-transparent text-slate-500 enabled:cursor-pointer enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700'}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center"
                  >
                    <AdminNavIcon id={item.icon} active={active} />
                  </span>
                  <span className="min-w-0 break-words">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <button
        type="button"
        disabled
        title="Em breve"
        className="my-4 flex min-h-10 items-center gap-3 px-4 text-left text-base font-medium text-gray-666 opacity-50"
      >
        <span className="flex size-5 items-center justify-center">
          <AdminNavIcon id="support" />
        </span>
        Suporte
      </button>
      <NavBarAccount userType={userType} />
    </aside>
  )
}
