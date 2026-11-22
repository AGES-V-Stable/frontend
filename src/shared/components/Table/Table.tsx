import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { TableProps, ColumnDefinition } from '@/shared/components/Table/types'
import { StatusBadge } from '@/shared/components/Table/StatusBadge'
import { TableActionButton } from '@/shared/components/Table/TableActionButton'
import { TablePagination } from '@/shared/components/Table/TablePagination'
import { getRecordRange } from '@/shared/components/Table/recordRange'

function getCellValue<T>(item: T, key: string): ReactNode {
  const value = (item as unknown as Record<string, unknown>)[key]
  return value !== undefined && value !== null ? String(value) : ''
}

function getRawSortValue<T>(item: T, column: ColumnDefinition<T>): string | number | null {
  const raw = column.sortValue
    ? column.sortValue(item)
    : (item as unknown as Record<string, unknown>)[column.key]
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'number' || typeof raw === 'string') return raw
  return String(raw)
}

function compareSortValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  const numA = typeof a === 'number' ? a : Number(a)
  const numB = typeof b === 'number' ? b : Number(b)
  if (
    String(a).trim() !== '' &&
    String(b).trim() !== '' &&
    Number.isFinite(numA) &&
    Number.isFinite(numB)
  ) {
    return numA - numB
  }

  const isoPattern = /^\d{4}-\d{2}-\d{2}/
  if (typeof a === 'string' && typeof b === 'string' && isoPattern.test(a) && isoPattern.test(b)) {
    const timeA = Date.parse(a)
    const timeB = Date.parse(b)
    if (Number.isFinite(timeA) && Number.isFinite(timeB)) return timeA - timeB
  }

  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true })
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
      <path
        d="M5 6.5 8 3.5l3 3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={direction === 'asc' ? 'text-primary' : 'text-slate-400'}
      />
      <path
        d="M5 9.5 8 12.5l3-3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={direction === 'desc' ? 'text-primary' : 'text-slate-400'}
      />
    </svg>
  )
}

export function Table<T>({
  compact = false,
  title,
  subtitle,
  footer,
  totalRecords,
  columns,
  data,
  actions,
  pagination,
  emptyMessage,
  entityLabel = 'registros',
  rowLabel,
  sortable = false,
}: TableProps<T>) {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )

  const sortedData = useMemo(() => {
    if (!sortable || !sortState) return data
    const column = columns.find((col) => col.key === sortState.key)
    if (!column) return data
    const factor = sortState.direction === 'asc' ? 1 : -1
    return [...data].sort(
      (left, right) =>
        compareSortValues(getRawSortValue(left, column), getRawSortValue(right, column)) * factor,
    )
  }, [columns, data, sortState, sortable])

  const toggleSort = (key: string) => {
    setSortState((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }
  // Resumo anunciado ao leitor de tela quando a página ou o filtro mudam a lista.
  const range = pagination && data.length > 0 ? getRecordRange(pagination) : undefined
  const summary = range
    ? `Mostrando ${range.start}-${range.end} de ${pagination!.totalRecords} ${pagination!.entityLabel ?? entityLabel}`
    : totalRecords !== undefined
      ? `${totalRecords} ${entityLabel}`
      : ''

  const renderCellContent = (item: T, column: ColumnDefinition<T>) => {
    if (column.render) {
      return column.render(item)
    }

    const value = getCellValue(item, column.key)

    switch (column.type) {
      case 'status':
        return <StatusBadge label={value as string} variant={column.statusVariant?.(item)} />

      case 'action':
        return (
          <div
            className={`flex gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}
          >
            {actions?.map((action, idx) => (
              <TableActionButton
                key={idx}
                label={action.label}
                accessibleLabel={rowLabel ? `${action.label}: ${rowLabel(item)}` : undefined}
                onClick={() => action.onClick(item)}
              />
            ))}
          </div>
        )

      case 'text':
      default:
        return value
    }
  }

  // Com título, o cabeçalho é um h2, para o leitor de tela achar a tabela pela lista de títulos.
  const TitleTag = title ? 'h2' : 'div'

  return (
    <div className="bg-white w-full flex flex-col pt-6 pb-6 rounded-lg overflow-x-auto">
      <p role="status" className="sr-only">
        {summary}
      </p>
      {(title || totalRecords !== undefined) && (
        <div className="px-6 mb-6">
          <TitleTag className="font-['IBM_Plex_Sans'] text-slate-900 font-medium text-[18px]">
            {title}{' '}
            {totalRecords !== undefined && !subtitle && (
              <span className="text-slate-900 text-[14px] font-medium ml-2">
                · {totalRecords} {entityLabel}
              </span>
            )}
          </TitleTag>
          {subtitle && (
            <p className="mt-1 text-[12px] font-normal text-slate-500">
              {totalRecords !== undefined && `${totalRecords} ${entityLabel} · `}
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div
        className={
          compact ? 'w-full overflow-x-auto' : 'w-full min-w-max flex flex-col px-6 min-h-[580px]'
        }
      >
        <table className={`w-full text-left border-collapse ${compact ? 'min-w-max' : ''}`}>
          <thead>
            <tr className="h-[40px]">
              {columns.map((col, index) => {
                const isColSortable = sortable && col.type !== 'action' && col.sortable !== false
                const activeDirection =
                  isColSortable && sortState?.key === col.key ? sortState.direction : null
                const justifyClass =
                  col.align === 'center'
                    ? 'justify-center'
                    : col.align === 'right'
                      ? 'justify-end'
                      : 'justify-start'

                return (
                  <th
                    key={col.key as string}
                    scope="col"
                    aria-sort={
                      isColSortable
                        ? activeDirection === 'asc'
                          ? 'ascending'
                          : activeDirection === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    style={{ width: col.width }}
                    className={`
                      font-['IBM_Plex_Sans'] font-medium text-[14px] leading-none text-slate-500 align-middle
                      ${index === 0 ? '' : 'pl-2'}
                      ${index === columns.length - 1 ? '' : 'pr-4'}
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                  >
                    {isColSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex w-full cursor-pointer items-center gap-1.5 py-1 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${justifyClass}`}
                      >
                        <span>{col.label}</span>
                        <SortIcon direction={activeDirection} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((item, rowIndex) => (
                <tr key={rowIndex} className="h-[64px] border-b border-sage-300">
                  {columns.map((col, colIndex) => (
                    <td
                      key={`${rowIndex}-${col.key as string}`}
                      className={`
                        font-['IBM_Plex_Sans'] font-normal text-[12px] leading-none text-slate-900 align-middle bg-white
                        ${colIndex === 0 ? '' : 'pl-2'}
                        ${colIndex === columns.length - 1 ? '' : 'pr-4'}
                        ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      `}
                    >
                      {renderCellContent(item, col)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-[120px] text-center font-['IBM_Plex_Sans'] text-slate-500 text-[14px]"
                >
                  {emptyMessage || 'Nenhum registro encontrado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex-1"></div>

        <div className="w-full h-[1px] bg-sage-300 mt-8"></div>

        {!compact && pagination && data.length > 0 && (
          <TablePagination {...pagination} entityLabel={pagination.entityLabel ?? entityLabel} />
        )}
      </div>
      {footer && <div className="px-6 pt-6">{footer}</div>}
      {compact && pagination && data.length > 0 && (
        <TablePagination
          {...pagination}
          compact
          entityLabel={pagination.entityLabel ?? entityLabel}
        />
      )}
    </div>
  )
}
