import type { ReactNode } from 'react'

export function ApplicationShell({
  navigation,
  children,
}: {
  navigation: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {navigation}
      <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
    </div>
  )
}
