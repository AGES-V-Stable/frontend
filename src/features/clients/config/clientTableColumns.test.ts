import { describe, expect, it } from 'vitest'

import { clientTableColumns } from '@/features/clients/config/clientTableColumns'
import type { Cliente } from '@/features/clients/types/Cliente'

const statusColumn = clientTableColumns.find((column) => column.key === 'status')!
const variantOf = (status: string) => statusColumn.statusVariant!({ status } as Cliente)

describe('clientTableColumns', () => {
  it('colors each registration status by its meaning', () => {
    expect(variantOf('Aprovada')).toBe('success')
    expect(variantOf('Em análise')).toBe('warning')
    expect(variantOf('Pendente')).toBe('warning')
    expect(variantOf('Não iniciado')).toBe('neutral')
    expect(variantOf('Rejeitada')).toBe('error')
    expect(variantOf('Expirado')).toBe('error')
  })

  it('shows an unknown status as neutral instead of success', () => {
    expect(variantOf('SUSPENDED')).toBe('neutral')
  })
})
