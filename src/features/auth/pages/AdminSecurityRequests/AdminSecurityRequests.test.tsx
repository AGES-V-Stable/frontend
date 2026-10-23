import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AdminSecurityRequests } from './AdminSecurityRequests'
import * as twoFactorApi from '@/features/auth/api/twoFactor'

vi.mock('@/features/auth/api/twoFactor', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api/twoFactor')>(
    '@/features/auth/api/twoFactor',
  )
  return {
    ...actual,
    get2faResetRequests: vi.fn(),
    approve2faReset: vi.fn(),
    reject2faReset: vi.fn(),
  }
})

describe('AdminSecurityRequests Component', () => {
  const mockRequests: twoFactorApi.TwoFactorResetRequest[] = [
    {
      id: 'req-1',
      userId: 'u1',
      userName: 'Marina Costa',
      userEmail: 'marina@empresa.com',
      companyName: 'Empresa Alpha Ltda',
      requestedAt: '2026-10-22T10:00:00Z',
      reason: 'Perdi meu celular e códigos.',
      documentNumber: '111.222.333-44',
      status: 'PENDING',
    },
    {
      id: 'req-2',
      userId: 'u2',
      userName: 'Carlos Silva',
      userEmail: 'carlos@empresa.com',
      companyName: 'Empresa Beta S.A.',
      requestedAt: '2026-10-21T15:00:00Z',
      reason: 'Celular furtado.',
      documentNumber: '555.666.777-88',
      status: 'PENDING',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(twoFactorApi.get2faResetRequests).mockResolvedValue(mockRequests)
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <AdminSecurityRequests />
      </MemoryRouter>,
    )
  }

  it('renderiza o título e a listagem de pedidos de reset de 2FA', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Solicitações de Segurança (Reset de 2FA)' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Marina Costa')).toBeInTheDocument()
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
    expect(screen.getAllByText('Pendente')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Aprovar Reset' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Rejeitar' })).toHaveLength(2)
  })

  it('ao clicar em Aprovar Reset, consome a API e atualiza a solicitação para Aprovado com aviso de bloqueio de 48h', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorApi.approve2faReset).mockResolvedValueOnce({
      success: true,
      withdrawalLockedUntil: '2026-10-24T10:00:00Z',
    })

    renderPage()
    await screen.findByText('Marina Costa')

    const approveButtons = screen.getAllByRole('button', { name: 'Aprovar Reset' })
    await user.click(approveButtons[0])

    expect(twoFactorApi.approve2faReset).toHaveBeenCalledWith('req-1')
    expect(
      await screen.findByText(
        /Reset de 2FA aprovado com sucesso. Bloqueio de segurança de 48h ativado na conta./i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Aprovado (Bloqueio 48h)')).toBeInTheDocument()
  })

  it('ao clicar em Rejeitar, consome a API e atualiza a solicitação para Rejeitado', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorApi.reject2faReset).mockResolvedValueOnce({ success: true })

    renderPage()
    await screen.findByText('Marina Costa')

    const rejectButtons = screen.getAllByRole('button', { name: 'Rejeitar' })
    await user.click(rejectButtons[0])

    expect(twoFactorApi.reject2faReset).toHaveBeenCalledWith('req-1')
    expect(await screen.findByText('Solicitação de reset rejeitada.')).toBeInTheDocument()
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
  })
})
