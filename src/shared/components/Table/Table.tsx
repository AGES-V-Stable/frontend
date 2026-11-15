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
}: TableProps<T>) {
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
              {columns.map((col, index) => (
                <th
                  key={col.key as string}
                  scope="col"
                  style={{ width: col.width }}
                  className={`
                    font-['IBM_Plex_Sans'] font-medium text-[14px] leading-none text-slate-500 align-middle
                    ${index === 0 ? '' : 'pl-2'}
                    ${index === columns.length - 1 ? '' : 'pr-4'}
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item, rowIndex) => (
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
