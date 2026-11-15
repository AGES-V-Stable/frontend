import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadIndividualKycStatus } from '@/features/onboarding/api/blindpayIndividualKyc'
import { PATHS } from '@/shared/navigation/paths'
import { BlindPayKycAccess } from './BlindPayKycAccess'

vi.mock('@/features/onboarding/api/blindpayIndividualKyc', () => ({
  loadIndividualKycStatus: vi.fn(),
}))

const pending = {
  termsAccepted: false,
  submitted: false,
  kycStatus: null,
  amlStatus: null,
}

function renderAccess(variant: 'dashboard' | 'settings') {
  return render(
    <MemoryRouter initialEntries={['/current']}>
      <Routes>
        <Route path="/current" element={<BlindPayKycAccess variant={variant} />} />
        <Route path={PATHS.BLINDPAY_KYC} element={<p>Tela de complemento</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BlindPayKycAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers the pending complement on the dashboard and opens the KYC screen', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue(pending)
    const user = userEvent.setup()
    renderAccess('dashboard')

    expect(
      await screen.findByRole('heading', { name: 'Complete sua verificação de identidade' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completar cadastro' }))

    expect(screen.getByText('Tela de complemento')).toBeInTheDocument()
  })

  it('does not show a dashboard warning after the profile was submitted', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      ...pending,
      termsAccepted: true,
      submitted: true,
      kycStatus: 'pending_review',
    })
    renderAccess('dashboard')

    await vi.waitFor(() => expect(loadIndividualKycStatus).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Complete sua verificação de identidade')).not.toBeInTheDocument()
  })

  it('keeps a permanent pending access in account settings', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue(pending)
    renderAccess('settings')

    expect(
      await screen.findByRole('heading', { name: 'Verificação de identidade' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Cadastro pendente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completar cadastro' })).toBeInTheDocument()
  })

  it('shows the submitted status in settings and allows opening its details', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      ...pending,
      termsAccepted: true,
      submitted: true,
      kycStatus: 'approved',
      amlStatus: 'clear',
    })
    const user = userEvent.setup()
    renderAccess('settings')

    expect(await screen.findByText('Identidade aprovada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Consultar verificação' }))
    expect(screen.getByText('Tela de complemento')).toBeInTheDocument()
  })

  it('allows retrying the status query from settings', async () => {
    vi.mocked(loadIndividualKycStatus)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pending)
    const user = userEvent.setup()
    renderAccess('settings')

    await user.click(
      await screen.findByRole('button', {
        name: 'Tentar novamente',
      }),
    )

    expect(await screen.findByText('Cadastro pendente')).toBeInTheDocument()
    expect(loadIndividualKycStatus).toHaveBeenCalledTimes(2)
  })
})
