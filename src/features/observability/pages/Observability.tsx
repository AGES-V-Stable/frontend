import { useEffect, useState } from 'react'
import { Drawer } from '@/shared/components/Drawer'
import { Table } from '@/shared/components/Table'
import { Button } from '@/shared/components/Button'
import {
  getEvent,
  getEvents,
  type EventFilters,
  type EventPage,
  type ObservabilityEvent,
} from '../api/events'

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
const date = (value: string) => new Date(value).toLocaleString('pt-BR')

export function Observability() {
  const [draft, setDraft] = useState(empty)
  const [filters, setFilters] = useState(empty)
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<EventPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ObservabilityEvent | null>(null)
  const [detailError, setDetailError] = useState(false)
  const [detailRevision, setDetailRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const result = await getEvents(filters, page, controller.signal)
        if (!controller.signal.aborted) setData(result)
      } catch {
        if (!controller.signal.aborted) setError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [filters, page, revision])

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
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  )
  const applyCorrelation = (id: string) => {
    const next = { ...filters, correlationId: id }
    setDraft(next)
    setFilters(next)
    setPage(0)
    setSelectedId(null)
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
          <Button
            label="Atualizar"
            className="w-auto!"
            variant="secondary"
            onClick={() => setRevision(revision + 1)}
          />
        </header>
        <form
          className="grid gap-4 rounded-lg border border-sage-300 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            setFilters({ ...draft })
            setPage(0)
          }}
        >
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
          <p className="text-xs text-slate-500 sm:col-span-2">
            Sem período: últimos 7 dias. Intervalo máximo: 90 dias, sujeito à retenção. Datas
            exibidas no horário local.
          </p>
          <div className="flex gap-2 sm:col-span-2 xl:justify-end">
            <Button
              label="Limpar filtros"
              variant="neutral"
              className="w-auto!"
              onClick={() => {
                setDraft(empty)
                setFilters(empty)
                setPage(0)
              }}
              type="button"
            />
            <Button label="Aplicar filtros" className="w-auto!" type="submit" />
          </div>
        </form>
        {loading ? (
          <p role="status">Carregando eventos...</p>
        ) : error ? (
          <div role="alert">
            <p>Não foi possível carregar os eventos. Confira os filtros e tente novamente.</p>
            <Button
              label="Tentar novamente"
              className="mt-3 w-auto!"
              onClick={() => setRevision(revision + 1)}
            />
          </div>
        ) : (
          data && (
            <>
              <div
                className="grid gap-4 sm:grid-cols-3"
                aria-label="Indicadores do período filtrado"
              >
                <div className="rounded-lg border border-sage-300 bg-white p-5">
                  <p className="text-sm text-slate-600">Eventos filtrados</p>
                  <p className="text-2xl font-semibold">{data.totalElements}</p>
                </div>
                <div className="rounded-lg border border-sage-300 bg-white p-5">
                  <p className="text-sm text-slate-600">Erros (ERROR)</p>
                  <p className="text-2xl font-semibold">{data.errors}</p>
                </div>
                <div className="rounded-lg border border-sage-300 bg-white p-5">
                  <p className="text-sm text-slate-600">Eventos com falha por módulo</p>
                  {data.failuresByModule.length ? (
                    <ul className="mt-2 text-sm">
                      {data.failuresByModule.map((item) => (
                        <li key={item.module}>
                          {item.module}: {item.failures}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm">Nenhuma falha.</p>
                  )}
                </div>
              </div>
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
