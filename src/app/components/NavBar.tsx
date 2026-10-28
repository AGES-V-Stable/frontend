import { useState } from 'react'
import type { ReactNode } from 'react'

export interface NavigationItem {
  id: string
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick?: () => void
  children?: NavigationItem[]
}
export interface NavBarProps {
  logo: ReactNode
  items: NavigationItem[]
  activeId: string
  account: { name: string; description: string; initials: string }
  footerItems: NavigationItem[]
}

/** Presentation only: AppRoutes supplies every destination and selected item. */
export function NavBar({ logo, items, activeId, account, footerItems }: NavBarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const button = (item: NavigationItem, nested = false) => {
    const selected = item.id === activeId
    const childSelected = item.children?.some((child) => child.id === activeId) ?? false
    const open = childSelected || expanded[item.id]
    return (
      <li key={item.id}>
        <button
          type="button"
          disabled={item.disabled}
          aria-current={selected ? 'page' : undefined}
          aria-expanded={item.children ? !!open : undefined}
          aria-controls={item.children ? `navigation-${item.id}` : undefined}
          onClick={
            item.children
              ? () => setExpanded((value) => ({ ...value, [item.id]: !open }))
              : item.onClick
          }
          className={`flex min-h-11 w-full items-center gap-3 rounded-r-lg border-r-4 py-2 pr-4 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${nested ? 'pl-12 text-sm' : 'pl-4'} ${selected ? 'border-primary bg-primary/35 text-primary' : 'border-transparent text-slate-500 enabled:cursor-pointer enabled:hover:bg-emerald-50'}`}
        >
          {!nested && (
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
          {item.children && (
            <span aria-hidden="true" className="ml-auto text-xs">
              {open ? '▾' : '▸'}
            </span>
          )}
        </button>
        {item.children && open && (
          <ul id={`navigation-${item.id}`} className="mt-2 flex flex-col gap-2">
            {item.children.map((child) => button(child, true))}
          </ul>
        )}
      </li>
    )
  }
  return (
    <aside
      className="sticky top-0 flex h-dvh w-[236px] shrink-0 flex-col border-r border-sage-300 bg-white"
      aria-label="Menu da conta"
    >
      <div className="flex h-[108px] shrink-0 items-center justify-center p-6">{logo}</div>
      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto pr-3">
        <ul className="flex flex-col gap-3">{items.map((item) => button(item))}</ul>
      </nav>
      <div className="pb-[15px] pt-[15px]">
        <ul className="mb-4 flex flex-col gap-3 pr-3">{footerItems.map((item) => button(item))}</ul>
        <div className="flex items-center gap-3 border-t border-sage-300 px-4 pb-2.5 pt-[11px]">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-700"
          >
            {account.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900" title={account.name}>
              {account.name}
            </p>
            <p
              className="truncate text-[11px] font-medium text-sage-800/70"
              title={account.description}
            >
              {account.description}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
