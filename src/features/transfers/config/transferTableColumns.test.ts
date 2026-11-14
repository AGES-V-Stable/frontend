import { describe, expect, it } from 'vitest'

import { transferStatusLabels } from '@/features/transfers/api/transfers'
import {
  transferStatusVariants,
  transferTableColumns,
} from '@/features/transfers/config/transferTableColumns'
import type { Transfer } from '@/features/transfers/types/transferHistory'

const statusColumn = transferTableColumns.find((column) => column.key === 'status')!
const variantOf = (status: string) => statusColumn.statusVariant!({ status } as Transfer)

describe('transferTableColumns', () => {
  it('colors pending and held transfers as warning and closed failures as error', () => {
    expect(variantOf('Aguardando pagamento')).toBe('warning')
    expect(variantOf('Retida')).toBe('warning')
    expect(variantOf('Expirada')).toBe('error')
    expect(variantOf('Cancelada')).toBe('error')
    expect(variantOf('Concluída')).toBe('success')
  })

  it('has a color for every status label the API adapter produces', () => {
    for (const label of Object.values(transferStatusLabels)) {
      expect(transferStatusVariants[label]).toBeDefined()
    }
  })

  it('shows an unknown status as neutral instead of success', () => {
    expect(variantOf('UNKNOWN_STATUS')).toBe('neutral')
  })
})
