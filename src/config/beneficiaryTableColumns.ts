import type { ColumnDefinition } from '@/components/Table'
import type { Beneficiary } from '@/data/mockBeneficiary'
import { maskCNPJ } from '@/utils/masks'

export const beneficiaryTableColumns: ColumnDefinition<Beneficiary>[] = [
  { key: 'nome', label: 'Beneficiário', type: 'text', width: 190 },
  { key: 'cnpj', label: 'CNPJ', type: 'text', width: 160, render: (item) => maskCNPJ(item.cnpj) },
  { key: 'empresa', label: 'Empresa proprietária', type: 'text', width: 240 },
  { key: 'country', label: 'País', type: 'text', width: 150 },
  { key: 'currency', label: 'Moeda', type: 'text', width: 100 },
  { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
  { key: 'action', label: 'Ação', type: 'action', width: 160, align: 'center' },
]