import { Link, useNavigate } from 'react-router'

import ComplianceStep from '@/pages/Register/ComplianceStep'
import { CompanyStep } from '@/pages/Register/CompanyStep'
import { RepresentativeStep } from '@/pages/Register/RepresentativeStep'
import { PATHS } from '@/routes/paths'

const routes = [
  { label: 'Início', description: 'Página inicial e navegação principal.', path: PATHS.DEMO_HOME },
  { label: 'Login', description: 'Acesso à plataforma.', path: PATHS.DEMO_LOGIN },
  {
    label: 'Cadastro da empresa',
    description: 'Entrada do formulário de dados da empresa.',
    path: PATHS.DEMO_REGISTER_COMPANY,
  },
  {
    label: 'Dados do representante',
    description: 'Dados societários, documento e endereço do representante.',
    path: PATHS.DEMO_REGISTER_REPRESENTATIVE,
  },
  {
    label: 'Compliance',
    description: 'Envio dos documentos de compliance vinculados ao cadastro.',
    path: PATHS.DEMO_REGISTER_COMPLIANCE,
  },
  {
    label: 'Clientes PME',
    description: 'Listagem, filtros, paginação e detalhes de clientes.',
    path: PATHS.DEMO_ADMIN_CLIENTS,
  },
]

export function Demo() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            V-Stable
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Demonstração de telas</h1>
          <p className="mt-2 text-slate-600">
            Selecione uma rota para visualizar o que já foi implementado.
          </p>
        </header>

        <nav aria-label="Telas disponíveis">
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {routes.map((route) => (
              <li key={route.path} className="border-b border-slate-200 last:border-b-0">
                <Link
                  to={route.path}
                  className="group flex items-center justify-between gap-5 px-5 py-5 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 sm:px-6"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">{route.label}</span>
                    <span className="mt-1 block text-sm text-slate-500">{route.description}</span>
                    <code className="mt-2 block text-xs text-emerald-700">{route.path}</code>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}

export function DemoCompany() {
  const navigate = useNavigate()

  return (
    <CompanyStep
      onCancel={() => navigate(PATHS.DEMO)}
      onContinue={() => navigate(PATHS.DEMO_REGISTER_REPRESENTATIVE)}
    />
  )
}

export function DemoRepresentative() {
  const navigate = useNavigate()

  return <RepresentativeStep onContinue={() => navigate(PATHS.DEMO_REGISTER_COMPLIANCE)} />
}

export function DemoCompliance() {
  return <ComplianceStep onContinue={async () => undefined} />
}
