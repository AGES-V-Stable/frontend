import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { request2faRecovery } from '@/features/auth/api/twoFactor'
import { TwoFactorRecoveryRequest } from './TwoFactorRecoveryRequest'

vi.mock('@/features/auth/api/twoFactor', () => ({ request2faRecovery: vi.fn() }))

function renderForm(props: Partial<Parameters<typeof TwoFactorRecoveryRequest>[0]> = {}) {
  const onCancel = vi.fn()
  const onSuccess = vi.fn()
  render(
    <TwoFactorRecoveryRequest
      initialEmail="marina@empresa.com"
      onCancel={onCancel}
      onSuccess={onSuccess}
      {...props}
    />,
  )
  return { onCancel, onSuccess }
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo do titular*'), 'Marina Costa')
  await user.type(screen.getByLabelText('CPF ou Documento de Identificação*'), '111.222.333-44')
}

describe('TwoFactorRecoveryRequest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exige os campos obrigatórios antes de enviar', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Enviar solicitação para análise' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Por favor, preencha todos os campos obrigatórios.',
    )
    expect(request2faRecovery).not.toHaveBeenCalled()
  })

  it('envia os dados preenchidos e mostra a confirmação', async () => {
    const user = userEvent.setup()
    vi.mocked(request2faRecovery).mockResolvedValueOnce({ success: true, id: 'req-1' })
    const { onSuccess } = renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação para análise' }))

    expect(
      await screen.findByRole('heading', { name: 'Solicitação enviada com sucesso' }),
    ).toBeInTheDocument()
    expect(request2faRecovery).toHaveBeenCalledWith({
      email: 'marina@empresa.com',
      fullName: 'Marina Costa',
      documentNumber: '111.222.333-44',
      reason: '',
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('mantém o formulário e mostra o erro quando a API falha', async () => {
    const user = userEvent.setup()
    vi.mocked(request2faRecovery).mockRejectedValueOnce(new Error(''))
    const { onSuccess } = renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação para análise' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar a solicitação. Tente novamente.',
    )
    expect(screen.getByLabelText('Nome completo do titular*')).toHaveValue('Marina Costa')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('volta para a verificação ao cancelar', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Voltar para a verificação' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
