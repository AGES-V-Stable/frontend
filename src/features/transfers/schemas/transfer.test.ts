import { describe, expect, it } from 'vitest'

import {
  QuoteResponseSchema,
  TransferAmountSchema,
  TransferExecutionSchema,
  TransferFormSchema,
} from '@/features/transfers/schemas/transfer'

const validForm = {
  amount: 125000,
  amountType: 'SOURCE',
  paymentMethod: 'PIX',
  beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
  description: '  Pagamento de importação  ',
}

const firstErrorFor = (input: unknown, field: string) => {
  const result = TransferFormSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe('TransferAmountSchema', () => {
  it('aceita o valor mínimo aceito pelo backend', () => {
    expect(TransferAmountSchema.safeParse(0.01).success).toBe(true)
    expect(TransferAmountSchema.safeParse(0).success).toBe(false)
  })
})

describe('TransferFormSchema', () => {
  it('aceita um formulário completo e remove espaços da descrição', () => {
    const result = TransferFormSchema.parse(validForm)
    expect(result.description).toBe('Pagamento de importação')
  })

  it('não envia descrição vazia', () => {
    expect(TransferFormSchema.parse({ ...validForm, description: '   ' }).description).toBe(
      undefined,
    )
  })

  it('rejeita descrição acima do limite do backend', () => {
    expect(firstErrorFor({ ...validForm, description: 'x'.repeat(129) }, 'description')).toBe(
      'A descrição deve ter no máximo 128 caracteres',
    )
  })

  it('exige valor maior que zero', () => {
    expect(firstErrorFor({ ...validForm, amount: 0 }, 'amount')).toBe(
      'Informe um valor maior que zero',
    )
  })

  it('aceita só os métodos de pagamento suportados pelos provedores', () => {
    expect(TransferFormSchema.safeParse({ ...validForm, paymentMethod: 'TED' }).success).toBe(true)
    expect(firstErrorFor({ ...validForm, paymentMethod: 'ACCOUNT_BALANCE' }, 'paymentMethod')).toBe(
      'Selecione o método de pagamento',
    )
  })

  it('exige a seleção do beneficiário', () => {
    expect(firstErrorFor({ ...validForm, beneficiaryId: '' }, 'beneficiaryId')).toBe(
      'Selecione o beneficiário',
    )
  })
})

describe('QuoteResponseSchema', () => {
  const quote = {
    quoteRequestId: '1a2b3c4d-5e6f-4789-8abc-def012345678',
    offer: {
      offerId: '7d7f2a54-8f0b-4c1e-9f0e-3c2a1b0d9e8f',
      sourceAmount: 1000,
      targetAmount: 182.45,
      exchangeRate: 0.18245,
      totalFee: 3.1,
      expiresAt: '2026-11-10T23:59:00+00:00',
      provider: 'BLINDPAY',
    },
  }

  it('aceita a oferta completa, com ou sem expiração', () => {
    expect(QuoteResponseSchema.safeParse(quote).success).toBe(true)
    expect(
      QuoteResponseSchema.safeParse({ ...quote, offer: { ...quote.offer, expiresAt: null } })
        .success,
    ).toBe(true)
  })

  it('rejeita valores não positivos para não exibir uma oferta inválida', () => {
    expect(
      QuoteResponseSchema.safeParse({ ...quote, offer: { ...quote.offer, targetAmount: 0 } })
        .success,
    ).toBe(false)
  })
})

describe('TransferExecutionSchema', () => {
  const execution = {
    executionId: '0b1c2d3e-4f50-4617-8293-a4b5c6d7e8f9',
    offerId: '7d7f2a54-8f0b-4c1e-9f0e-3c2a1b0d9e8f',
    transactionId: null,
    provider: 'BLINDPAY',
    status: 'REQUOTE_REQUIRED',
    source: { amount: 1000, currency: 'BRL' },
    target: { amount: 182.45, currency: 'USD' },
    fundingInstructions: null,
    requote: {
      source: { amount: 1000, currency: 'BRL' },
      target: { amount: 180.1, currency: 'USD' },
      expiresAt: '2026-11-10T23:59:00Z',
    },
    failureCode: null,
  }

  it('aceita a execução com recotação', () => {
    expect(TransferExecutionSchema.parse(execution).requote?.target.amount).toBe(180.1)
  })

  it('rejeita status desconhecido', () => {
    expect(TransferExecutionSchema.safeParse({ ...execution, status: 'DONE' }).success).toBe(false)
  })

  it('aceita a resposta de um backend anterior, sem método nem dados de TED', () => {
    const parsed = TransferExecutionSchema.parse(execution)

    expect(parsed.fundingMethod).toBeNull()
    expect(parsed.fundingBankTransfer).toBeNull()
  })

  it('aceita as instruções de TED e completa com nulo os campos que a BlindPay não enviou', () => {
    const parsed = TransferExecutionSchema.parse({
      ...execution,
      status: 'AWAITING_FUNDS',
      fundingMethod: 'TED',
      fundingBankTransfer: { memoCode: 'BP-MEMO-1', accountNumber: '31254097', bankName: null },
    })

    expect(parsed.fundingMethod).toBe('TED')
    expect(parsed.fundingBankTransfer).toEqual({
      memoCode: 'BP-MEMO-1',
      beneficiaryName: null,
      beneficiaryAddress: null,
      bankName: null,
      bankAddress: null,
      routingNumber: null,
      accountNumber: '31254097',
      accountType: null,
    })
  })

  it('rejeita método de pagamento desconhecido', () => {
    expect(TransferExecutionSchema.safeParse({ ...execution, fundingMethod: 'CASH' }).success).toBe(
      false,
    )
  })
})
