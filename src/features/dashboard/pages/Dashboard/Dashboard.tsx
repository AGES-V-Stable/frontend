import { useEffect, useState } from 'react'
import type { ZodType } from 'zod'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BalanceCard } from '@/features/dashboard/components/BalanceCard'
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters'
import { TransactionVolumeCard } from '@/features/dashboard/components/TransactionVolumeCard'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'
import { StatusBadge, Table, type StatusVariant } from '@/shared/components/Table'
import { Button } from '@/shared/components/Button'
import { formatMoneyString, formatDateTime } from '@/shared/utils/formatters'
import {
  getDashboard,
  summarySchema,
  seriesSchema,
  settlementsSchema,
  downloadStatement,
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
const card = 'rounded-xl border border-sage-300 bg-white p-6'
// Mesmo visual dos cards de saldo e volume, que dividem a linha de métricas com a economia.
const metricCard = 'rounded-2xl border border-sage-300 bg-white p-6 shadow-sm'

function ClientBalanceCard() {
  const { state, retry } = useBalance()
  return <BalanceCard state={state} onRetry={retry} />
}

function VolumeCard({ filters, admin }: { filters: Filters; admin: boolean }) {
  const { state, retry } = useTransactionVolume(filters, admin)
  return <TransactionVolumeCard state={state} onRetry={retry} />
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
  const title = savings ? 'Histórico de Economia' : 'Volume de Remessas (BRL)'
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
      <h2 className="mb-6 text-lg font-semibold text-slate-900">{title}</h2>
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
                    fill="var(--color-primary)"
                    isAnimationActive={false}
                  />
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
      {savings && (
        <p className="mt-3 text-xs text-slate-500">
          Estimativa frente ao câmbio bancário de referência, descontada a tarifa registrada.
        </p>
      )}
    </section>
  )
}
/** Dashboard do épico AGES-V-Stable/cicd#44, nas visões de cliente e de administrador. */
export function Dashboard({ admin = false }: { admin?: boolean }) {
  const [filters, setFilters] = useState<Filters>(() =>
    toDashboardFilters(DEFAULT_FILTER_FORM, todayInSaoPaulo(), admin),
  )
  const [page, setPage] = useState(1)
  const applyFilters = (form: DashboardFilterForm) => {
    setFilters(toDashboardFilters(form, todayInSaoPaulo(), admin))
    setPage(1)
  }
  const summary = useDashboard(admin, 'summary', filters, summarySchema)
  const settlements = useDashboard(admin, 'settlements', filters, settlementsSchema, {
    page: String(page - 1),
    size: '5',
  })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const exportPdf = async () => {
    setExporting(true)
    setExportError(false)
    try {
      await downloadStatement()
    } catch {
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }
  const columns = [
    ...(!admin
      ? [
          {
            key: 'counterparty',
            label: 'Beneficiário / Destino',
            render: (r: Settlement) => (
              <>
                <span className="font-medium">{r.counterparty ?? 'Não registrado'}</span>
                <span className="block text-xs text-slate-500">{r.destination}</span>
              </>
            ),
          },
        ]
      : []),
    {
      key: 'date',
      label: 'Data / Hora',
      render: (r: Settlement) => {
        const date = r.settledAt ?? r.createdAt
        return date ? formatDateTime(date) : 'Não registrada'
      },
    },
    {
      key: 'direction',
      label: 'Tipo',
      render: (r: Settlement) =>
        r.direction === 'PAYMENT' ? 'Pagamento' : r.direction === 'RECEIPT' ? 'Recebimento' : '—',
    },
    { key: 'amount', label: 'Valor', render: (r: Settlement) => money(r.amount, r.currency) },
    {
      key: 'status',
      label: 'Status da ordem',
      render: (r: Settlement) => (
        <StatusBadge label={STATUS[r.status].label} variant={STATUS[r.status].variant} />
      ),
    },
  ]
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 lg:px-12">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          {admin ? 'Dashboard administrativo' : 'Conta empresarial'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Liquidações registradas • Valores consolidados em BRL
        </p>
      </header>
      <DashboardFilters admin={admin} onApply={applyFilters} />
      <div className={`grid gap-6 ${admin ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {!admin && <ClientBalanceCard />}
        <section className={metricCard} aria-label="Economia acumulada">
          <h2 className="text-sm text-sage-800">Economia Acumulada</h2>
          <p className="text-xs text-slate-500">{describePeriod(filters)}</p>
          {summary.error ? (
            <Failure retry={summary.retry} />
          ) : !summary.data ? (
            <p role="status">Carregando...</p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-primary">{money(summary.data.amount)}</p>
              {summary.data.incomplete && (
                <p className="mt-2 text-sm">
                  {summary.data.incompleteOperations} operação(ões) sem valor ou tarifa registrados
                  ficaram fora da soma.
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Estimativa com spread de referência de{' '}
                {summary.data.referenceSpreadPercentage.replace('.', ',')}%.
              </p>
            </>
          )}
        </section>
        <VolumeCard filters={filters} admin={admin} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard admin={admin} filters={filters} />
        <ChartCard admin={admin} filters={filters} savings />
      </div>
      <section className={card} aria-label="Últimas liquidações">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Últimas Liquidações Internacionais</h2>
          {!admin && (
            <Button
              className="!w-auto !px-4"
              label={exporting ? 'Gerando extrato...' : 'Gerar extrato completo'}
              disabled={exporting}
              onClick={() => void exportPdf()}
            />
          )}
        </div>
        {exportError && <p role="alert">Não foi possível gerar o extrato. Tente novamente.</p>}
        {settlements.error ? (
          <Failure retry={settlements.retry} />
        ) : !settlements.data ? (
          <p role="status">Carregando liquidações...</p>
        ) : (
          <Table
            compact
            columns={columns}
            data={settlements.data.content}
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
        <p className="mt-3 text-xs text-slate-500">
          Até 20 liquidações recentes. Datas e valores ausentes permanecem indisponíveis.
        </p>
      </section>
    </section>
  )
}
