import type { ReactNode } from 'react'
import type { TableProps, ColumnDefinition } from './types'
import { StatusBadge } from './StatusBadge'
import { TableActionButton } from './TableActionButton'
import { TablePagination } from './TablePagination'

function getCellValue<T>(item: T, key: string): ReactNode {
  const value = (item as unknown as Record<string, unknown>)[key]
  return value !== undefined && value !== null ? String(value) : ''
}

export function Table<T>({
  title,
  totalRecords,
  columns,
  data,
  actions,
  pagination,
  emptyMessage,
}: TableProps<T>) {
  const renderCellContent = (item: T, column: ColumnDefinition<T>) => {
    if (column.render) {
      return column.render(item)
    }

    const value = getCellValue(item, column.key)

    switch (column.type) {
      case 'status':
        return <StatusBadge label={value as string} />

      case 'action':
        return (
          <div
            className={`flex gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}
          >
            {actions?.map((action, idx) => (
              <TableActionButton
                key={idx}
                label={action.label}
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

  return (
    <div className="bg-[#FFFFFF] w-full flex flex-col pt-6 pb-6 rounded-lg overflow-x-auto">
      {(title || totalRecords !== undefined) && (
        <div className="px-6 mb-6 font-['IBM_Plex_Sans'] text-[#0F172A] font-medium text-[18px]">
          {title}{' '}
          {totalRecords !== undefined && (
            <span className="text-[#0F172A] text-[14px] font-medium ml-2">
              · {totalRecords} contas
            </span>
          )}
        </div>
      )}

      <div className="w-full min-w-max flex flex-col min-h-[580px] px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-[40px]">
              {columns.map((col, index) => (
                <th
                  key={col.key as string}
                  scope="col"
                  style={{ width: col.width }}
                  className={`
                    font-['IBM_Plex_Sans'] font-medium text-[14px] leading-none text-[#64748B] align-middle
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
                <tr
                  key={rowIndex}
                  className="h-[64px] border-b border-[var(--Neutral-Grey-Border,#BBCABF)]"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={`${rowIndex}-${col.key as string}`}
                      className={`
                        font-['IBM_Plex_Sans'] font-normal text-[12px] leading-none text-[#0F172A] align-middle bg-[#FFFFFF]
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
                  className="h-[120px] text-center font-['IBM_Plex_Sans'] text-[#64748B] text-[14px]"
                >
                  {emptyMessage || 'Nenhum cliente cadastrado no momento.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex-1"></div>

        <div className="w-full h-[1px] bg-[var(--Neutral-Grey-Border,#BBCABF)] mt-8"></div>

        {pagination && <TablePagination {...pagination} />}
      </div>
    </div>
  )
}
