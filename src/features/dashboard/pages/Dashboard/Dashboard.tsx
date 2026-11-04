import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ZodType } from 'zod'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BalanceCard } from '@/features/dashboard/components/BalanceCard'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters'
import { TransactionVolumeCard } from '@/features/dashboard/components/TransactionVolumeCard'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'
import { StatusBadge, Table, type StatusVariant } from '@/shared/components/Table'
import { adminTransferDetailsPath, transferDetailsPath } from '@/shared/navigation/paths'
import { formatMoneyString, formatDateTime } from '@/shared/utils/formatters'
import {
  getDashboard,
  summarySchema,
  seriesSchema,
  settlementsSchema,
} from '@/features/dashboard/api/dashboard'
import type { Settlement } from '@/features/dashboard/api/dashboard'
import type {
  DashboardFilterForm,
  DashboardFilters as Filters,
} from '@/features/dashboard/types/dashboardFilters'
import {
  DEFAULT_FILTER_FORM,
  describePeriod,
  filtersQuery,
  toDashboardFilters,
  todayInSaoPaulo,
} from '@/features/dashboard/utils/period'

function useDashboard<T>(
  admin: boolean,
  resource: string,
  filters: Filters,
  schema: ZodType<T>,
  extra: Record<string, string> = {},
) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; data?: T; error?: boolean }>({ key: '' })
  const extraQuery = new URLSearchParams(extra).toString()
  const key = `${admin}/${resource}?${filtersQuery(filters).toString()}&${extraQuery}/${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    void getDashboard(
      admin,
      resource,
      filters,
      schema,
      controller.signal,
      Object.fromEntries(new URLSearchParams(extraQuery)),
    ).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      () => {
        if (!controller.signal.aborted) setState({ key, error: true })
      },
    )
    return () => controller.abort()
  }, [key, admin, resource, filters, schema, extraQuery])
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key && state.error,
    retry: () => setAttempt((v) => v + 1),
  }
}
// Eixo dos gráficos em reais, de forma compacta (R$ 340 mil); o valor exato fica no tooltip.
const compactBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})
const axisMoney = (value: number) => compactBrl.format(value)

// Mesmos rótulos da tela de detalhes de transferência.
const STATUS: Record<Settlement['status'], { label: string; variant: StatusVariant }> = {
  SETTLED: { label: 'Concluída', variant: 'success' },
  PROCESSING: { label: 'Processando', variant: 'warning' },
  AWAITING_PAYMENT: { label: 'Aguardando pagamento', variant: 'warning' },
  HELD: { label: 'Retida para análise', variant: 'warning' },
  FAILED: { label: 'Com falha', variant: 'error' },
  PARTIAL_FAILURE: { label: 'Falha parcial', variant: 'error' },
  CANCELED: { label: 'Cancelada', variant: 'error' },
  EXPIRED: { label: 'Expirada', variant: 'error' },
}

const money = (amount: string | null, currency = 'BRL') =>
  formatMoneyString(amount, currency) ?? 'Indisponível'
const percent = (value: string) => `${value.replace('.', ',')}%`
// Cotação em reais por unidade da moeda estrangeira, exibida com duas casas como no Figma.
const rate = (value: string | null) => money(value)
const card = 'rounded-xl border border-sage-300 bg-white p-5'

function ClientBalanceCard() {
  const { state, retry } = useBalance()
  return <BalanceCard state={state} onRetry={retry} />
}

function VolumeCard({ filters, admin }: { filters: Filters; admin: boolean }) {
  const { state, retry } = useTransactionVolume(filters, admin)
  return (
    <TransactionVolumeCard
      state={state}
      onRetry={retry}
      accent={admin ? 'sky' : 'neutral'}
      footnote={describePeriod(filters)}
    />
  )
}

function SavingsCard({ admin, filters }: { admin: boolean; filters: Filters }) {
  const summary = useDashboard(admin, 'summary', filters, summarySchema)
  const data = summary.data
  return (
    <MetricCard
      title="Economia Acumulada"
      accent="emerald"
      state={
        summary.error
          ? {
              status: 'error',
              message: 'Não foi possível carregar os dados.',
              onRetry: summary.retry,
            }
          : !data
            ? { status: 'loading', label: 'Carregando...' }
            : { status: 'ready', value: money(data.amount) }
      }
      footnote={
        <>
          <p>
            {data?.averageEffectiveSpreadPercentage
              ? `Spread efetivo médio: ${percent(data.averageEffectiveSpreadPercentage)}`
              : admin && !filters.companyId
                ? 'Economia consolidada da plataforma'
                : describePeriod(filters)}
          </p>
          {data?.incomplete && (
            <p>
              {data.incompleteOperations} operação(ões) sem valor ou tarifa registrados ficaram fora
              da soma.
            </p>
          )}
          {data && (
            <p>Estimativa com spread de referência de {percent(data.referenceSpreadPercentage)}.</p>
          )}
        </>
      }
    />
  )
}

function Failure({ retry }: { retry: () => void }) {
  return (
    <div role="alert">
      <p>Não foi possível carregar os dados.</p>
      <button type="button" className="mt-3 text-primary underline" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  )
}

function ChartCard({
  admin,
  filters,
  savings = false,
}: {
  admin: boolean
  filters: Filters
  savings?: boolean
}) {
  const title = savings ? 'Histórico de Economia (BRL)' : 'Volume de Remessas (BRL)'
  const subtitle = savings
    ? 'Economia gerada em taxas e spread ao longo do período'
    : 'Volume processado em BRL por mês'
  const result = useDashboard(
    admin,
    savings ? 'savings-history' : 'remittance-volume',
    filters,
    seriesSchema,
  )
  const points = result.data?.points.map((p) => ({
    ...p,
    value: Number(p.amount),
    label: new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(`${p.month}-01T12:00:00Z`)),
  }))
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis width={80} tick={{ fontSize: 12 }} tickFormatter={axisMoney} />
      <Tooltip
        formatter={(_, __, item) => money((item.payload as { amount: string | null }).amount)}
      />
    </>
  )
  return (
    <section className={card} aria-label={title}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {result.data && points && points.length > 0 && (
          <p
            className={`rounded-lg px-4 py-3 font-mono font-medium ${savings ? 'bg-emerald-50 text-primary' : 'bg-blue-50 text-sky-600'}`}
          >
            {money(result.data.total)}
          </p>
        )}
      </div>
      {result.error ? (
        <Failure retry={result.retry} />
      ) : !result.data || !points ? (
        <p role="status">Carregando...</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma operação no período.</p>
      ) : (
        <>
          {result.data.incompleteOperations > 0 && (
            <p role="status" className="mb-3 text-sm text-slate-600">
              Dados incompletos. Há operações sem valor ou tarifa registrados fora da soma.
            </p>
          )}
          <div className="h-64" role="img" aria-label={`${title}, valores mensais em reais`}>
            <ResponsiveContainer width="100%" height="100%">
              {savings ? (
                <AreaChart data={points} accessibilityLayer>
                  {axes}
                  <Area
                    type="linear"
                    dataKey="value"
                    name="Economia"
                    stroke="var(--color-primary)"
                    fill="var(--color-emerald-50)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <BarChart data={points} accessibilityLayer>
                  {axes}
                  <Bar
                    dataKey="value"
                    name="Volume"
                    fill="var(--color-sky-600)"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  >
                    {/* Como no Figma, o mês mais recente da série fica em destaque. */}
                    {points.map((p, index) => (
                      <Cell
                        key={p.month}
                        fill={
                          index === points.length - 1
                            ? 'var(--color-primary)'
                            : 'var(--color-sky-600)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <details className="mt-2 text-sm">
            <summary>Consultar valores mensais</summary>
            <ul>
              {points.map((p) => (
                <li key={p.month}>
                  {p.label}: {money(p.amount)}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}

/** Dashboard do épico AGES-V-Stable/cicd#44, nas visões de cliente e de administrador. */
export function Dashboard({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>(() =>
    toDashboardFilters(DEFAULT_FILTER_FORM, todayInSaoPaulo(), admin),
  )
  const [page, setPage] = useState(1)
  const applyFilters = (form: DashboardFilterForm) => {
    setFilters(toDashboardFilters(form, todayInSaoPaulo(), admin))
    setPage(1)
  }
  const settlements = useDashboard(admin, 'settlements', filters, settlementsSchema, {
    page: String(page - 1),
    size: '5',
  })
  const counterparty = {
    key: 'counterparty',
    label: admin ? 'Beneficiário' : 'Beneficiário / Destino',
    render: (r: Settlement) => (
      <>
        <span className="font-medium">{r.counterparty ?? 'Não registrado'}</span>
        {r.destination && <span className="block text-xs text-slate-500">{r.destination}</span>}
      </>
    ),
  }
  const date = {
    key: 'date',
    label: admin ? 'Data' : 'Data / Hora',
    render: (r: Settlement) => {
      const value = r.settledAt ?? r.createdAt
      return value ? formatDateTime(value) : 'Não registrada'
    },
  }
  const amount = {
    key: 'amount',
    label: admin ? 'Valor' : 'Valor enviado',
    render: (r: Settlement) => (
      <span className="font-mono font-medium text-slate-900">{money(r.amount, r.currency)}</span>
    ),
  }
  const status = {
    key: 'status',
    label: 'Status',
    render: (r: Settlement) => (
      <StatusBadge label={STATUS[r.status].label} variant={STATUS[r.status].variant} />
    ),
  }
  const columns = admin
    ? [
        counterparty,
        {
          key: 'direction',
          label: 'Tipo',
          render: (r: Settlement) =>
            r.direction === 'PAYMENT'
              ? 'Pagamento'
              : r.direction === 'RECEIPT'
                ? 'Recebimento'
                : '—',
        },
        amount,
        date,
        status,
        { key: 'details', label: '', type: 'action' as const, align: 'right' as const },
      ]
    : [
        counterparty,
        date,
        amount,
        { key: 'exchangeRate', label: 'Câmbio', render: (r: Settlement) => rate(r.exchangeRate) },
        status,
        { key: 'details', label: '', type: 'action' as const, align: 'right' as const },
      ]
  const charts = [
    <ChartCard key="volume" admin={admin} filters={filters} />,
    <ChartCard key="savings" admin={admin} filters={filters} savings />,
  ]
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 lg:px-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">
            {admin ? 'Dashboard Administrativo' : 'Visão Geral Corporativa'}
          </h1>
          {admin && (
            <span className="rounded-2xl bg-blue-50 px-3 py-1 text-sm font-bold text-sky-700">
              PAINEL ADMIN
            </span>
          )}
        </div>
        <p className="text-lg font-semibold text-slate-500">
          {admin
            ? 'Visão consolidada da operação, performance financeira e liquidações dos beneficiários.'
            : 'Liquidações registradas • Valores consolidados em BRL'}
        </p>
      </header>
      <div className={`grid gap-4 ${admin ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {!admin && <ClientBalanceCard />}
        <SavingsCard admin={admin} filters={filters} />
        <VolumeCard filters={filters} admin={admin} />
      </div>
      <DashboardFilters admin={admin} onApply={applyFilters} />
      <div className="grid gap-6 lg:grid-cols-2">{admin ? charts : [...charts].reverse()}</div>
      <section className={card} aria-label="Últimas liquidações">
        <h2 className="mb-2 text-xl font-bold text-slate-900">
          {admin ? 'Últimas Liquidações' : 'Últimas Liquidações Internacionais'}
        </h2>
        {settlements.error ? (
          <Failure retry={settlements.retry} />
        ) : !settlements.data ? (
          <p role="status">Carregando liquidações...</p>
        ) : (
          <Table
            compact
            columns={columns}
            data={settlements.data.content}
            actions={[
              {
                label: 'Detalhes',
                onClick: (r: Settlement) =>
                  void navigate(admin ? adminTransferDetailsPath(r.id) : transferDetailsPath(r.id)),
              },
            ]}
            emptyMessage="Nenhuma liquidação registrada."
            entityLabel="liquidações"
            pagination={
              settlements.data.totalPages > 0
                ? {
                    currentPage: page,
                    totalPages: settlements.data.totalPages,
                    displayedRecords: settlements.data.content.length,
                    itemsPerPage: 5,
                    totalRecords: settlements.data.totalElements,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        )}
      </section>
    </section>
  )
}
