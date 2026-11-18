import { useEffect, useState } from 'react'
import { Drawer } from '@/shared/components/Drawer'
import { Table } from '@/shared/components/Table'
import { Button } from '@/shared/components/Button'
import {
  getEvent,
  getDashboard,
  type EventFilters,
  type EventDashboard,
  type EventBucket,
  type EventSummary,
  type Severity,
  type ObservabilityEvent,
} from '../api/events'
import { ObservabilityCharts } from '../components/ObservabilityCharts'
import {
  formatDate as date,
  localDraft,
  periodRange,
  resolveFilters,
  timezone,
  type Period,
} from '../period'

const empty: EventFilters = {
  from: '',
  to: '',
  severity: '',
  module: '',
  action: '',
  outcome: '',
  correlationId: '',
  order: 'desc',
}
const inputStyle =
  'mt-1 w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-primary'

export function Observability() {
  const [filters, setFilters] = useState(() => ({ ...empty, ...periodRange('24h') }))
  const [draft, setDraft] = useState(() => localDraft(filters))
  const [period, setPeriod] = useState<Period>('24h')
  const [draftPeriod, setDraftPeriod] = useState<Period>('24h')
  const [filterError, setFilterError] = useState('')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [chartSelection, setChartSelection] = useState<{
    bucket: Pick<EventBucket, 'from' | 'to'>
    severity: Severity
    filters: EventFilters
    period: Period
    summary: EventSummary
  } | null>(null)
  const requestKey = JSON.stringify([filters, page, revision])
  const [result, setResult] = useState<{
    key: string
    data?: EventDashboard
    chartSummary?: EventSummary
    error?: boolean
    updatedAt?: string
  }>({
    key: '',
  })
  const loading = result.key !== requestKey
  const error = !loading && result.error
  const dashboard = result.data
  const chartSummary = chartSelection?.summary ?? result.chartSummary
  const data = dashboard?.events
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ObservabilityEvent | null>(null)
  const [detailError, setDetailError] = useState(false)
  const [detailRevision, setDetailRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const data = await getDashboard(filters, page, controller.signal)
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            data,
            chartSummary: chartSelection?.summary ?? data.summary,
            updatedAt: data.summary.generatedAt,
          })
      } catch {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            key: requestKey,
            error: true,
            chartSummary: previous.chartSummary,
            updatedAt: previous.updatedAt,
          }))
      }
    }
    void load()
    return () => controller.abort()
  }, [filters, page, revision, requestKey, chartSelection])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    const load = async () => {
      setDetail(null)
      setDetailError(false)
      try {
        const result = await getEvent(selectedId, controller.signal)
        if (!controller.signal.aborted) setDetail(result)
      } catch {
        if (!controller.signal.aborted) setDetailError(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedId, detailRevision])

  const textFilter = (key: keyof EventFilters, label: string, type = 'text', pattern?: string) => (
    <label className="text-sm text-slate-700" key={key}>
      {label}
      <input
        className={inputStyle}
        type={type}
        value={draft[key]}
        maxLength={key === 'action' ? 120 : 80}
        pattern={pattern}
        step={type === 'datetime-local' ? '0.001' : undefined}
        required={key === 'from' || key === 'to'}
        disabled={(key === 'from' || key === 'to') && draftPeriod !== 'custom'}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  )
  const applyCorrelation = (id: string) => {
    const next = { ...filters, correlationId: id }
    setDraft(localDraft(next))
    setFilters(next)
    setPage(0)
    setSelectedId(null)
    setChartSelection(null)
  }
  const selectPoint = (bucket: Pick<EventBucket, 'from' | 'to'>, severity: Severity) => {
    if (!chartSummary) return
    const selected =
      chartSelection !== null &&
      Date.parse(chartSelection.bucket.from) === Date.parse(bucket.from) &&
      Date.parse(chartSelection.bucket.to) === Date.parse(bucket.to) &&
      chartSelection.severity === severity
    const baseFilters = chartSelection?.filters ?? filters
    const basePeriod = chartSelection?.period ?? period
    const next = selected
      ? baseFilters
      : { ...baseFilters, from: bucket.from, to: bucket.to, severity }
    setChartSelection(
      selected
        ? null
        : { bucket, severity, filters: baseFilters, period: basePeriod, summary: chartSummary },
    )
    setFilters(next)
    setDraft(localDraft(next))
    setPeriod(selected ? basePeriod : 'custom')
    setDraftPeriod(selected ? basePeriod : 'custom')
    setFilterError('')
    setPage(0)
  }
  const refresh = () => {
    if (period !== 'custom') {
      const next = { ...filters, ...periodRange(period) }
      setFilters(next)
      setDraft(localDraft(next))
      setDraftPeriod(period)
    }
    setPage(0)
    setRevision((value) => value + 1)
  }

  return (
    <section className="min-h-screen w-full px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Observability</h1>
            <p className="mt-1 text-sm text-slate-600">
              Investigue operações, integrações e falhas da aplicação.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {result.updatedAt && (
              <p className="text-xs text-slate-600">
                Última atualização: {date(result.updatedAt)} ({timezone})
              </p>
            )}
            <Button
              label="Atualizar"
              className="w-auto!"
              variant="secondary"
              onClick={refresh}
              disabled={loading}
            />
          </div>
        </header>
        <form
          className="grid gap-4 rounded-lg border border-sage-300 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            try {
              const next = resolveFilters(draft, draftPeriod)
              setFilters(next)
              setDraft(localDraft(next))
              setPeriod(draftPeriod)
              setChartSelection(null)
              setFilterError('')
              setPage(0)
            } catch {
              setFilterError('Selecione um intervalo crescente de até 90 dias.')
            }
          }}
        >
          <label className="text-sm text-slate-700">
            Período
            <select
              className={inputStyle}
              value={draftPeriod}
              onChange={(event) => {
                const value = event.target.value as Period
                setDraftPeriod(value)
                if (value !== 'custom') setDraft(localDraft({ ...draft, ...periodRange(value) }))
              }}
            >
              <option value="1h">Última hora</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="custom">Intervalo personalizado</option>
            </select>
          </label>
          {textFilter('from', 'De (horário local)', 'datetime-local')}
          {textFilter('to', 'Até (horário local)', 'datetime-local')}
          <label className="text-sm text-slate-700">
            Severidade
            <select
              className={inputStyle}
              value={draft.severity}
              onChange={(event) => setDraft({ ...draft, severity: event.target.value })}
            >
              <option value="">Todas</option>
              <option>INFO</option>
              <option>WARN</option>
              <option>ERROR</option>
            </select>
          </label>
          {textFilter('module', 'Módulo', 'text', '[a-z_]+')}
          {textFilter('action', 'Ação', 'text', '[a-z_.]+')}
          {textFilter('outcome', 'Resultado', 'text', '[a-z_]+')}
          {textFilter('correlationId', 'Correlação (UUID)', 'text', '[0-9a-fA-F-]{36}')}
          <label className="text-sm text-slate-700">
            Ordenação
            <select
              className={inputStyle}
              value={draft.order}
              onChange={(event) => setDraft({ ...draft, order: event.target.value })}
            >
              <option value="desc">Mais recentes</option>
              <option value="asc">Mais antigos</option>
            </select>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-full">
            Intervalo máximo: 90 dias, sujeito à retenção. Datas em {timezone}; consultas em UTC. O
            início é inclusivo e o fim exclusivo.
          </p>
          {filterError && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-full">
              {filterError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-sage-200 pt-4 sm:col-span-full">
            <Button
              label="Limpar filtros"
              variant="neutral"
              className="w-auto!"
              onClick={() => {
                const next = { ...empty, ...periodRange('24h') }
                setDraft(localDraft(next))
                setFilters(next)
                setPeriod('24h')
                setDraftPeriod('24h')
                setFilterError('')
                setChartSelection(null)
                setPage(0)
              }}
              type="button"
            />
            <Button label="Aplicar filtros" className="w-auto!" type="submit" />
          </div>
        </form>
        {chartSummary && (
          <>
            <p className="text-xs text-slate-600">
              Período consultado: {date(chartSummary.from)} até {date(chartSummary.to)} ({timezone}
              ), sujeito à retenção de eventos.
            </p>
            <ObservabilityCharts
              key={`${chartSummary.from}:${chartSummary.to}`}
              summary={chartSummary}
              metrics={dashboard?.summary ?? chartSummary}
              selection={chartSelection}
              onSelect={selectPoint}
            />
          </>
        )}
        {loading ? (
          <p role="status">Carregando eventos...</p>
        ) : error ? (
          <div role="alert">
            <p>Não foi possível carregar os eventos. Confira os filtros e tente novamente.</p>
            <Button label="Tentar novamente" className="mt-3 w-auto!" onClick={refresh} />
          </div>
        ) : (
          data && (
            <>
              <Table<ObservabilityEvent>
                title="Eventos"
                totalRecords={data.totalElements}
                entityLabel="eventos"
                compact
                data={data.content}
                rowLabel={(event) => `${event.action} ${event.id}`}
                emptyMessage="Nenhum evento encontrado para os filtros selecionados."
                columns={[
                  {
                    key: 'occurredAt',
                    label: 'Data e hora',
                    render: (event) => date(event.occurredAt),
                  },
                  {
                    key: 'severity',
                    label: 'Severidade',
                    type: 'status',
                    statusVariant: (event) =>
                      event.severity === 'ERROR'
                        ? 'error'
                        : event.severity === 'WARN'
                          ? 'warning'
                          : 'neutral',
                  },
                  { key: 'module', label: 'Módulo' },
                  { key: 'action', label: 'Ação' },
                  { key: 'outcome', label: 'Resultado' },
                  { key: 'source', label: 'Origem' },
                  { key: 'actions', label: 'Detalhes', type: 'action' },
                ]}
                actions={[{ label: 'Ver detalhes', onClick: (event) => setSelectedId(event.id) }]}
                pagination={{
                  currentPage: data.page + 1,
                  totalPages: data.totalPages,
                  displayedRecords: data.content.length,
                  itemsPerPage: data.size,
                  totalRecords: data.totalElements,
                  onPageChange: (value) => setPage(value - 1),
                  entityLabel: 'eventos',
                }}
              />
              <p className="text-xs text-slate-500">
                Indicadores contam eventos, que podem pertencer à mesma operação. Eventos do
                navegador são relatos não confiáveis.
              </p>
            </>
          )
        )}
      </div>
      <Drawer
        open={selectedId !== null}
        title="Detalhes do evento"
        onClose={() => setSelectedId(null)}
      >
        {detailError ? (
          <div role="alert">
            <p>Não foi possível carregar o evento.</p>
            <Button
              label="Tentar novamente"
              onClick={() => setDetailRevision(detailRevision + 1)}
            />
          </div>
        ) : !detail ? (
          <p role="status">Carregando detalhes...</p>
        ) : (
          <div className="space-y-5">
            <dl className="space-y-3 text-sm break-words">
              {[
                ['Identificador', detail.id],
                ['Data e hora (UTC)', detail.occurredAt],
                ['Severidade', detail.severity],
                ['Módulo', detail.module],
                ['Ação', detail.action],
                ['Resultado', detail.outcome],
                ['Mensagem', detail.message],
                [
                  'Usuário (ID interno)',
                  detail.actorId ?? 'Não autenticado / processamento interno',
                ],
                ['Entidade', detail.entityType ?? 'Não se aplica'],
                ['ID da entidade', detail.entityId ?? 'Não se aplica'],
                [
                  'Duração',
                  detail.durationMs === null ? 'Não se aplica' : `${detail.durationMs} ms`,
                ],
                ['Origem', detail.source === 'browser' ? 'Navegador (não confiável)' : 'Backend'],
                ['Correlação', detail.correlationId ?? 'Processamento interno'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold text-slate-600">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {detail.correlationId && (
              <Button
                label="Ver eventos desta correlação"
                variant="secondary"
                onClick={() => applyCorrelation(detail.correlationId!)}
              />
            )}
            <div>
              <h2 className="mb-2 font-semibold">Contexto técnico</h2>
              <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  )
}
