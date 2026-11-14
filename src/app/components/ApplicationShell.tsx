import type { ReactNode } from 'react'

export function ApplicationShell({
  navigation,
  header,
  children,
}: {
  navigation: ReactNode
  /** Barra superior opcional, acima do conteúdo da página. */
  header?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {navigation}
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  )
}
