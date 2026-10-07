import { useContext } from 'react'
import { Link } from 'react-router'

import { PATHS } from '@/app/routes/paths'
import { AccountContext } from '@/features/home/components/Account/accountContext'
import { ClientLayout } from '../components/ClientLayout'

function DashboardContent() {
  const { company, loading } = useContext(AccountContext)
  const balance = company?.availableBalanceBrl
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-6 py-8 lg:px-12">
      <h1 className="sr-only">Visão geral da conta PME</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Saldo Disponível (BRL)',
            value:
              typeof balance === 'number'
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    balance,
                  )
                : '—',
            detail: loading
              ? 'Carregando saldo...'
              : typeof balance === 'number'
                ? 'Saldo da conta empresarial'
                : 'Saldo indisponível no momento',
          },
          {
            title: 'Economia Acumulada (YTD)',
            value: '—',
            detail: 'Informações ainda não disponíveis',
          },
          {
            title: 'Volume Transacionado (Mês)',
            value: '—',
            detail: 'Informações ainda não disponíveis',
          },
        ].map((card) => (
          <section key={card.title} className="rounded-xl border border-sage-300 bg-white p-6">
            <h2 className="text-sm font-medium text-sage-800">{card.title}</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-6 text-sm text-sage-600">{card.detail}</p>
          </section>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {['Volume de Remessas (USD)', 'Histórico de Economia'].map((title) => (
          <section key={title} className="rounded-xl border border-sage-300 bg-white p-6">
            <h2 className="text-lg font-medium text-slate-900">{title}</h2>
            <p className="flex min-h-[200px] items-center justify-center text-sm text-sage-600">
              Informações ainda não disponíveis
            </p>
          </section>
        ))}
      </div>
      <section className="rounded-xl border border-sage-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Últimas Liquidações Internacionais</h2>
        <p className="py-10 text-sm text-sage-600">
          Histórico de liquidações ainda não disponível.
        </p>
      </section>
      <Link
        to={PATHS.BENEFICIARIES}
        className="self-start rounded-md text-sm font-medium text-primary underline focus-visible:outline-2"
      >
        Gerenciar beneficiários
      </Link>
    </div>
  )
}

export function PmeHome() {
  return (
    <ClientLayout>
      <DashboardContent />
    </ClientLayout>
  )
}
