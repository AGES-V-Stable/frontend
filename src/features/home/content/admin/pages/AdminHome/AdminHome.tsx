import { Link } from 'react-router'

import { Home } from '@/features/home/Home'
import { PATHS } from '@/app/routes/paths'

export function AdminHome() {
  return (
    <Home>
      <main className="min-w-0 flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Painel administrativo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Gerencie as contas PME e consulte as operações da plataforma.
        </p>
        <div className="mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          <Link
            to={PATHS.ADMIN_CLIENTS}
            className="rounded-xl border border-sage-300 bg-white p-6 font-medium text-primary"
          >
            Gerenciar clientes PME
          </Link>
          <Link
            to={PATHS.ADMIN_AUDIT}
            className="rounded-xl border border-sage-300 bg-white p-6 font-medium text-primary"
          >
            Acessar auditoria
          </Link>
        </div>
      </main>
    </Home>
  )
}
