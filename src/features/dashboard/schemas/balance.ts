import { z } from 'zod'

import type { Balance } from '@/features/dashboard/types/balance'

/** A resposta só é exibida se vier no formato do contrato; qualquer divergência vira erro. */
export const BalanceSchema = z.object({
  availableBalanceBrl: z.string().regex(/^-?\d+(\.\d+)?$/, 'Valor decimal inválido'),
}) satisfies z.ZodType<Balance>
