import type { ColumnDefinition, StatusVariant } from '@/shared/components/Table'
import type { Cliente } from '@/features/clients/types/Cliente'

// Cor de cada status do cadastro, pelo rótulo exibido (ver statusLabels em api/clients.ts).
export const clientStatusVariants: Record<string, StatusVariant> = {
  Aprovada: 'success',
  'Em análise': 'warning',
  Pendente: 'warning',
  'Não iniciado': 'neutral',
  Rejeitada: 'error',
  Expirado: 'error',
}

export const clientTableColumns: ColumnDefinition<Cliente>[] = [
  { key: 'empresa', label: 'Empresa', type: 'text', width: 300 },
  { key: 'cnpj', label: 'CNPJ', type: 'text', width: 210 },
  { key: 'cidade', label: 'Cidade / UF', type: 'text', width: 210 },
  { key: 'atualizacao', label: 'Última atualização', type: 'text', width: 160 },
  {
    key: 'status',
    label: 'Status',
    type: 'status',
    width: 140,
    align: 'center',
    statusVariant: (item) => clientStatusVariants[item.status] ?? 'neutral',
  },
  { key: 'responsavel', label: 'Responsável', type: 'text', width: 160 },
  { key: 'action', label: 'Ação', type: 'action', width: 200, align: 'center' },
]
