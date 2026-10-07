import type { ReactNode } from 'react'

import { AccountHeader } from '@/features/home/components/Account/AccountHeader'
import { Home } from '@/features/home/Home'

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <Home className="flex min-h-screen bg-[#F1F5F9]">
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AccountHeader />
        <main className="flex-1">{children}</main>
      </div>
    </Home>
  )
}
