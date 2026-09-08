import type { SidebarProps } from './types'

export function Sidebar({ logo, items, activeItemId, account, className = '' }: SidebarProps) {
  return (
    <aside
      className={`flex h-dvh w-[236px] shrink-0 flex-col border-r border-[#ccd8d2] bg-white ${className}`}
    >
      <div className="flex h-20 shrink-0 items-center justify-center px-4">{logo}</div>

      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                aria-current={item.id === activeItemId ? 'page' : undefined}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-r-md border-r-[3px] px-4 py-2 text-left text-xs leading-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 ${
                  item.id === activeItemId
                    ? 'min-h-11 border-[#009e73] bg-[#a8dbcd] text-[#007f5d]'
                    : 'min-h-10 border-transparent text-[#666666] hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-5 shrink-0 items-center justify-center"
                >
                  {item.icon}
                </span>
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-h-[61px] shrink-0 items-center gap-3 border-t border-[#ccd8d2] px-4 py-2.5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ccf2e8] text-[10px] font-medium text-[#007f5d]"
        >
          {account.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-medium text-gray-900" title={account.name}>
            {account.name}
          </p>
          <p className="truncate text-[8px] text-[#66736c]" title={account.description}>
            {account.description}
          </p>
        </div>
      </div>
    </aside>
  )
}
