import { describe, expect, it } from 'vitest'

import { TransferAmountSchema, TransferFormSchema } from './transfer'

const validForm = {
  amount: 125000,
  amountType: 'SOURCE',
  paymentMethod: 'ACCOUNT_BALANCE',
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
  })

  it.each([0, -10, 0.001])('rejeita %s como valor da transferência', (amount) => {
    expect(TransferAmountSchema.safeParse(amount).success).toBe(false)
  })
})

describe('TransferFormSchema', () => {
  it('aceita um formulário completo e remove espaços da descrição', () => {
    const result = TransferFormSchema.parse(validForm)

    expect(result).toEqual({ ...validForm, description: 'Pagamento de importação' })
  })

  it('não envia descrição vazia', () => {
    const result = TransferFormSchema.parse({ ...validForm, description: '   ' })

    expect(result).not.toHaveProperty('description', expect.anything())
  })

  it('exige valor maior que zero', () => {
    expect(firstErrorFor({ ...validForm, amount: 0 }, 'amount')).toBe(
      'Informe um valor maior que zero',
    )
  })

  it('exige a seleção do método de pagamento', () => {
    expect(firstErrorFor({ ...validForm, paymentMethod: '' }, 'paymentMethod')).toBe(
      'Selecione o método de pagamento',
    )
  })

  it('exige a seleção do beneficiário', () => {
    expect(firstErrorFor({ ...validForm, beneficiaryId: '' }, 'beneficiaryId')).toBe(
      'Selecione o beneficiário',
    )
  })

  it('rejeita lado do valor diferente de SOURCE ou DESTINATION', () => {
    expect(TransferFormSchema.safeParse({ ...validForm, amountType: 'BOTH' }).success).toBe(false)
  })
})
