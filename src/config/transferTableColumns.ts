import type { ColumnDefinition } from '@/components/Table'
import type { Transfer } from '@/data/mockTransfers'
import { formatCurrency, formatDate } from '@/utils/formatters'

export const transferTableColumns: ColumnDefinition<Transfer>[] = [
  { key: 'empresa', label: 'Empresa', type: 'text', width: 200 },
  { key: 'beneficiario', label: 'Beneficiário', type: 'text', width: 200 },
  {
    key: 'data',
    label: 'Data',
    type: 'text',
    width: 150,
    render: (item) => formatDate(item.data),
  },
  { key: 'tipo', label: 'Tipo', type: 'text', width: 150 },
  {
    key: 'valor',
    label: 'Valor',
    type: 'text',
    width: 180,
    align: 'right',
    render: (item) => formatCurrency(item.valor, item.moeda),
  },
  { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
  { key: 'action', label: 'Ação', type: 'action', width: 150, align: 'center' },
]
