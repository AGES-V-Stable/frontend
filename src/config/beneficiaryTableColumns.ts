import type { ColumnDefinition } from '@/components/Table'
import type { Beneficiary } from '@/types/beneficiary'
import { maskCNPJ } from '@/utils/masks'

export const beneficiaryTableColumns: ColumnDefinition<Beneficiary>[] = [
  { key: 'nickname', label: 'Beneficiário', type: 'text', width: 190 },
  {
    key: 'identificationDocument',
    label: 'Documento',
    type: 'text',
    width: 160,
    render: (item) => (item.identificationDocument ? maskCNPJ(item.identificationDocument) : '-'),
  },
  { key: 'companyId', label: 'ID da Empresa', type: 'text', width: 240 },
  { key: 'country', label: 'País', type: 'text', width: 150 },
  // { key: 'receivingMethod', label: 'Método', type: 'text', width: 140 },
  // { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
  { key: 'action', label: 'Ação', type: 'action', width: 160, align: 'center' },
]
