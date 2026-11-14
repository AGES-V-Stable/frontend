import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addSimulatedBalance } from '@/features/dashboard/api/balance'
import { SimulatedDepositDialog } from '@/features/dashboard/components/SimulatedDepositDialog'
import { HttpError } from '@/shared/http/httpClient'

vi.mock('@/features/dashboard/api/balance', () => ({ addSimulatedBalance: vi.fn() }))
const addMock = vi.mocked(addSimulatedBalance)

function renderDialog() {
  const handlers = { onDeposited: vi.fn(), onClose: vi.fn() }
  render(<SimulatedDepositDialog {...handlers} />)
  return handlers
}
const amountField = () => screen.getByLabelText('Valor do crédito simulado (R$)')
const submit = () => screen.getByRole('button', { name: 'Adicionar saldo simulado' })

describe('SimulatedDepositDialog', () => {
  beforeEach(() => {
    addMock.mockReset()
  })

  it('is a named modal that says the credit is not real money', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog', { name: 'Adicionar saldo simulado' })
    expect(dialog).toHaveAccessibleDescription(/não movimenta dinheiro real/)
  })

  it('sends the normalized amount and reports the confirmed deposit', async () => {
    addMock.mockResolvedValue('120.50')
    const { onDeposited } = renderDialog()

    await userEvent.type(amountField(), '20,50')
    await userEvent.click(submit())

    expect(addMock).toHaveBeenCalledWith('20.50')
    expect(onDeposited).toHaveBeenCalledTimes(1)
  })

  it('validates the amount before calling the API', async () => {
    renderDialog()

    await userEvent.type(amountField(), '1.234,56')
    await userEvent.click(submit())

    expect(screen.getByRole('alert')).toHaveTextContent('até duas casas decimais')
    expect(addMock).not.toHaveBeenCalled()
  })

  it('keeps the amount and shows the reason when the backend refuses', async () => {
    addMock.mockRejectedValue(new HttpError('x', 409, {}, 'BALANCE_LIMIT_EXCEEDED'))
    const { onDeposited } = renderDialog()

    await userEvent.type(amountField(), '50')
    await userEvent.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent('acima do limite permitido')
    expect(amountField()).toHaveValue('50')
    expect(onDeposited).not.toHaveBeenCalled()
  })

  it('given a deposit in progress, blocks a second submit and closing', async () => {
    addMock.mockReturnValue(new Promise(() => undefined))
    const { onClose } = renderDialog()

    await userEvent.type(amountField(), '10')
    await userEvent.click(submit())

    expect(screen.getByRole('button', { name: 'Adicionando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(addMock).toHaveBeenCalledTimes(1)
  })

  it('closes on Cancelar', async () => {
    const { onClose } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
