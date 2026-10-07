import { useContext } from 'react'

import type { UserType } from '@/shared/services/session'
import { maskCNPJ } from '@/shared/utils/masks'
import { AccountContext } from '../Account/accountContext'
import { initialsOf } from '../Account/initials'

export function NavBarAccount({ userType }: { userType: UserType }) {
  const { company } = useContext(AccountContext)
  const name =
    userType === 'admin' ? 'Administrador V-Stable' : company?.legalName || 'Conta empresarial'
  const description =
    userType === 'admin'
      ? 'Painel administrativo'
      : company
        ? `CNPJ: ${maskCNPJ(company.cnpj)}`
        : 'Empresa vinculada à conta'
  return (
    <div className="flex min-h-[71px] shrink-0 items-center gap-3 border-t border-sage-300 px-4 py-2.5">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-primary"
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900" title={name}>
          {name}
        </p>
        <p className="truncate text-[11px] text-sage-800" title={description}>
          {description}
        </p>
      </div>
    </div>
  )
}
