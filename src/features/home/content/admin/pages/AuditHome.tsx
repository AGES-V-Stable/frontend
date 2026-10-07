import { Link } from 'react-router'

import { PATHS } from '@/app/routes/paths'
import { Home } from '@/features/home/Home'

export function AuditHome() {
  return (
    <Home>
      <main className="min-w-0 flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Auditoria</h1>
        <p className="mt-2 text-sm text-slate-500">
          Consulte beneficiários e movimentações da plataforma.
        </p>
        <div className="mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          <Link
            to={PATHS.ADMIN_BENEFICIARIES}
            className="rounded-xl border border-sage-300 bg-white p-6 font-medium text-primary"
          >
            Consultar beneficiários
          </Link>
          <Link
            to={PATHS.ADMIN_TRANSFERS}
            className="rounded-xl border border-sage-300 bg-white p-6 font-medium text-primary"
          >
            Consultar transferências
          </Link>
        </div>
      </main>
    </Home>
  )
}
