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
import { TransactionVolumeCard } from '@/features/dashboard/components/TransactionVolumeCard'
import { useBalance } from '@/features/dashboard/hooks/useBalance'
import { useTransactionVolume } from '@/features/dashboard/hooks/useTransactionVolume'
import { Table } from '@/shared/components/Table'
import { Button } from '@/shared/components/Button'
import { formatMoneyString, formatDateTime } from '@/shared/utils/formatters'
import {
  getDashboard,
  summarySchema,
  seriesSchema,
  settlementsSchema,
  downloadStatement,
} from '@/features/dashboard/api/dashboard'
import type { Period, Settlement } from '@/features/dashboard/api/dashboard'

function useDashboard<T>(admin: boolean, suffix: string, schema: ZodType<T>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; data?: T; error?: boolean }>({ key: '' })
  const key = `${admin}/${suffix}/${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    void getDashboard(admin, suffix, schema, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      () => {
        if (!controller.signal.aborted) setState({ key, error: true })
      },
    )
    return () => controller.abort()
  }, [admin, suffix, schema, key])
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key && state.error,
    retry: () => setAttempt((v) => v + 1),
  }
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

function ClientVolumeCard() {
  const { state, retry } = useTransactionVolume()
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
function ChartCard({ admin, savings = false }: { admin: boolean; savings?: boolean }) {
  const [period, setPeriod] = useState<Period>('SIX_MONTHS')
  const title = savings ? 'Histórico de Economia' : 'Volume de Remessas (BRL)'
  const result = useDashboard(
    admin,
    `${savings ? 'savings-history' : 'remittance-volume'}?period=${period}`,
    seriesSchema,
  )
  const points = result.data?.points.map((p) => ({
    ...p,
    value: p.amount === null ? null : Number(p.amount),
    label: new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(`${p.month}-01T12:00:00Z`)),
  }))
  const empty = points?.every((p) => p.amount === '0.00' || p.amount === '0')
  const unavailable = points?.some((p) => p.incomplete || p.amount === null)
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis width={70} tick={{ fontSize: 12 }} />
      <Tooltip
        formatter={(_, __, item) => money((item.payload as { amount: string | null }).amount)}
      />
    </>
  )
  return (
    <section className={card} aria-label={title}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <select
          aria-label={`Período — ${title}`}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-md border border-sage-300 bg-surface px-3 py-2 text-sm"
        >
          <option value="ALL">Desde o início</option>
          <option value="SIX_MONTHS">6 meses</option>
          <option value="THIS_MONTH">Esse mês</option>
        </select>
      </div>
      {result.error ? (
        <Failure retry={result.retry} />
      ) : !result.data ? (
        <p role="status">Carregando...</p>
      ) : (
        <>
          {unavailable && (
            <p role="status" className="mb-3 text-sm text-slate-600">
              Dados incompletos. Há valores ou datas de liquidação não registrados.
            </p>
          )}
          {empty && <p className="text-sm text-slate-500">Nenhuma operação no período.</p>}
          <div className="h-64" role="img" aria-label={`${title}, valores mensais em reais`}>
            <ResponsiveContainer width="100%" height="100%">
              {savings ? (
                <AreaChart data={points} accessibilityLayer>
                  {axes}
                  <Area
                    type="linear"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    fill="var(--color-emerald-50)"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <BarChart data={points} accessibilityLayer>
                  {axes}
                  <Bar dataKey="value" fill="var(--color-primary)" isAnimationActive={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <details className="mt-2 text-sm">
            <summary>Consultar valores mensais</summary>
            <ul>
              {points?.map((p) => (
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
          Estimativa com spread de referência fixo de 4%, descontada a tarifa registrada.
        </p>
      )}
    </section>
  )
}
/** Dashboard do épico AGES-V-Stable/cicd#44, nas visões de cliente e de administrador. */
export function Dashboard({ admin = false }: { admin?: boolean }) {
  const summary = useDashboard(admin, 'summary', summarySchema)
  const [page, setPage] = useState(1)
  const settlements = useDashboard(admin, `settlements?page=${page - 1}&size=5`, settlementsSchema)
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
      render: (r: Settlement) => (r.date ? formatDateTime(r.date) : 'Não registrada'),
    },
    {
      key: 'direction',
      label: 'Tipo',
      render: (r: Settlement) => (r.direction === 'PAYMENT' ? 'Pagamento' : 'Recebimento'),
    },
    { key: 'amount', label: 'Valor', render: (r: Settlement) => money(r.amount, r.currency) },
    {
      key: 'status',
      label: 'Status da ordem',
      render: () => <span className="rounded bg-emerald-50 px-2 py-1 text-primary">Liquidado</span>,
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
      <div className={`grid gap-6 ${admin ? 'max-w-xl' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {!admin && <ClientBalanceCard />}
        <section className={metricCard} aria-label="Economia acumulada">
          <h2 className="text-sm text-sage-800">
            Economia Acumulada {summary.data ? `(${summary.data.year})` : ''}
          </h2>
          {summary.error ? (
            <Failure retry={summary.retry} />
          ) : !summary.data ? (
            <p role="status">Carregando...</p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold text-primary">{money(summary.data.amount)}</p>
              {summary.data.incomplete && (
                <p className="mt-2 text-sm">
                  Subtotal conhecido: {money(summary.data.knownSubtotal)}. Histórico incompleto.
                </p>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Estimativa anual com spread de referência fixo de 4%.
          </p>
        </section>
        {!admin && <ClientVolumeCard />}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard admin={admin} />
        <ChartCard admin={admin} savings />
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
