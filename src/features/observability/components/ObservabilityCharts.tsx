import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EventBucket, EventSummary, Severity } from '../api/events'
import { formatDate, localDraft, timezone } from '../period'

type ChartRange = Pick<EventBucket, 'from' | 'to'>

const series = [
  { severity: 'ERROR', key: 'error', color: '#b91c1c' },
  { severity: 'WARN', key: 'warn', color: '#b45309' },
  { severity: 'INFO', key: 'info', color: '#0369a1' },
] as const

export function ObservabilityCharts({
  summary,
  metrics,
  selection,
  onSelect,
}: {
  summary: EventSummary
  metrics: EventSummary
  selection: { bucket: ChartRange; severity: Severity } | null
  onSelect: (range: ChartRange, severity: Severity) => void
}) {
  const chart = selection ? metrics : summary
  const [rangeDraft, setRangeDraft] = useState(() =>
    localDraft({ from: summary.from, to: summary.to }),
  )
  const bounds = localDraft({ from: summary.from, to: summary.to })
  const from = Date.parse(rangeDraft.from)
  const to = Date.parse(rangeDraft.to)
  const validRange = from < to && from >= Date.parse(summary.from) && to <= Date.parse(summary.to)
  const isSelected = (range: ChartRange, severity: Severity) =>
    selection?.severity === severity &&
    Date.parse(selection.bucket.from) === Date.parse(range.from) &&
    Date.parse(selection.bucket.to) === Date.parse(range.to)
  const tick = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      timeZone: timezone,
      ...(chart.interval === 'day'
        ? { day: '2-digit', month: '2-digit' }
        : { hour: '2-digit', minute: '2-digit' }),
    })

  return (
    <>
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores do período filtrado"
      >
        {[
          ['Eventos filtrados', metrics.total],
          ['Erros (ERROR)', metrics.errors],
          ['Avisos (WARN)', metrics.warnings],
          ['Informações (INFO)', metrics.infos],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-sage-300 bg-white p-5">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          className="min-w-0 rounded-lg border border-sage-300 bg-white p-5"
          aria-label="Eventos por horário"
        >
          <h2 className="font-semibold text-slate-900">Eventos por horário</h2>
          <p className="mt-1 text-xs text-slate-600">
            Agrupamento por {{ minute: 'minuto', hour: 'hora', day: 'dia' }[chart.interval]} em UTC.
            Horários exibidos em {timezone}.
          </p>
          {chart.total === 0 && (
            <p role="status" className="mb-3 text-sm text-slate-600">
              Nenhum evento no período selecionado.
            </p>
          )}
          <div
            className="mt-4 h-72 w-full"
            aria-label={
              selection
                ? `Gráfico de linhas de ${selection.severity}`
                : 'Gráfico de linhas de ERROR, WARN e INFO'
            }
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={chart.series} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7dfd4" />
                <XAxis
                  dataKey="from"
                  tickFormatter={tick}
                  minTickGap={32}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} width={45} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(label) => formatDate(String(label))} />
                {series.map(({ severity, key, color }) => (
                  <Line
                    key={key}
                    name={severity}
                    dataKey={key}
                    type="linear"
                    stroke={color}
                    strokeWidth={2}
                    hide={selection !== null && selection.severity !== severity}
                    isAnimationActive={false}
                    activeDot={false}
                    dot={({ cx, cy, index }) => {
                      const bucket = chart.series[index]
                      return (
                        <circle
                          key={`${severity}-${index}`}
                          cx={cx}
                          cy={cy}
                          r={isSelected(bucket, severity) ? 6 : 4}
                          fill={color}
                          stroke="white"
                          className="cursor-pointer"
                          onClick={() => {
                            setRangeDraft(localDraft({ from: bucket.from, to: bucket.to }))
                            onSelect(bucket, severity)
                          }}
                        >
                          <title>{`${severity}: ${bucket[key]} — ${formatDate(bucket.from)} até ${formatDate(bucket.to)}`}</title>
                        </circle>
                      )
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-3 border-t border-sage-200 pt-3 sm:grid-cols-2">
            {(
              [
                ['from', 'Início do intervalo do gráfico'],
                ['to', 'Fim do intervalo do gráfico'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="min-w-0 text-xs text-slate-600">
                {label}
                <input
                  type="datetime-local"
                  step="0.001"
                  required
                  min={bounds.from}
                  max={bounds.to}
                  className="mt-1 w-full min-w-0 rounded border border-sage-300 bg-white p-2 text-sm text-slate-900 focus-visible:outline-primary"
                  value={rangeDraft[field]}
                  aria-invalid={!validRange}
                  onChange={(event) =>
                    setRangeDraft({ ...rangeDraft, [field]: event.target.value })
                  }
                />
              </label>
            ))}
            {!validRange && (
              <p role="alert" className="text-sm text-red-700 sm:col-span-2">
                Selecione um intervalo crescente dentro do período do gráfico.
              </p>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {series.map(({ severity }) => (
                <button
                  key={severity}
                  type="button"
                  disabled={!validRange}
                  aria-pressed={selection?.severity === severity}
                  className="cursor-pointer rounded border border-sage-300 px-3 py-2 text-sm text-primary hover:bg-sage-100 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white"
                  onClick={() =>
                    onSelect(
                      { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
                      severity,
                    )
                  }
                >
                  Ver {severity}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Use Ver ERROR, Ver WARN ou Ver INFO para exibir a série no gráfico e filtrar a tabela no
            intervalo informado. Clique novamente no botão ativo para restaurar todas as séries e os
            filtros anteriores.
          </p>
        </section>
        <section
          className="min-w-0 rounded-lg border border-sage-300 bg-white p-5"
          aria-label="Módulos com mais erros"
        >
          <h2 className="font-semibold text-slate-900">Módulos com mais erros</h2>
          <p className="mt-1 text-xs text-slate-600">
            Até 10 módulos por eventos ERROR nos filtros atuais.
          </p>
          {metrics.errorsByModule.length ? (
            <ol className="mt-5 space-y-4">
              {metrics.errorsByModule.map((item) => (
                <li key={item.module}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="break-all">{item.module}</span>
                    <strong>{item.errors.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="h-2 rounded bg-sage-200" aria-hidden="true">
                    <div
                      className="h-2 rounded bg-red-700"
                      style={{
                        width: `${(100 * item.errors) / metrics.errorsByModule[0].errors}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm text-slate-600">Nenhum erro nos filtros selecionados.</p>
          )}
        </section>
      </div>
    </>
  )
}
