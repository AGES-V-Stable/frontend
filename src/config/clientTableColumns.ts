import type { ColumnDefinition } from '@/components/Table'
import type { Cliente } from '@/data/mockClients'

export const clientTableColumns: ColumnDefinition<Cliente>[] = [
  { key: 'empresa', label: 'Empresa', type: 'text', width: 300 },
  { key: 'cnpj', label: 'CNPJ', type: 'text', width: 210 },
  { key: 'cidade', label: 'Cidade / UF', type: 'text', width: 210 },
  { key: 'atualizacao', label: 'Última atualização', type: 'text', width: 160 },
  { key: 'status', label: 'Status', type: 'status', width: 140, align: 'center' },
  { key: 'responsavel', label: 'Responsável', type: 'text', width: 160 },
  { key: 'action', label: 'Ação', type: 'action', width: 200, align: 'center' },
]