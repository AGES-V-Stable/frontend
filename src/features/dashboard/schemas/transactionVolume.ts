import { z } from 'zod'

import type { TransactionVolume } from '@/features/dashboard/types/transactionVolume'

/** A resposta só é exibida se vier no formato do contrato; qualquer divergência vira erro. */
export const TransactionVolumeSchema = z.object({
  transactedVolumeBrl: z.string().regex(/^-?\d+(\.\d+)?$/, 'Valor decimal inválido'),
}) satisfies z.ZodType<TransactionVolume>
