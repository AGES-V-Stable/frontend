import { useContext } from 'react'

import { AccountContext } from './accountContext'
import { initialsOf } from './initials'

export function AccountHeader() {
  const { user, loading, error } = useContext(AccountContext)
  return (
    <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-3 border-b border-sage-300 bg-white px-6 py-4 lg:px-12">
      <span className="text-lg font-semibold text-slate-900">V-Stable • Conta empresarial</span>
      <div className="text-sm text-slate-900">
        {user && (
          <span>
            {user.name} • {initialsOf(user.name)}
          </span>
        )}
        {loading && (
          <p role="status" className="text-slate-500">
            Carregando...
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
    </header>
  )
}
