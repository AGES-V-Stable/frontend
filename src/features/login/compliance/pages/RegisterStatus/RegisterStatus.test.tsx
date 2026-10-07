import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser } from '@/shared/services/user'
import { getCompanyComplianceStatus } from '@/shared/services/company'
import { RegisterStatus } from './RegisterStatus'

vi.mock('@/shared/services/user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/shared/services/company', () => ({ getCompanyComplianceStatus: vi.fn() }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register/status']}>
      <Routes>
        <Route path="/register/status" element={<RegisterStatus />} />
        <Route path="/" element={<p>Plataforma</p>} />
        <Route path="/register" element={<p>Cadastro</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegisterStatus', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser)
      .mockReset()
      .mockResolvedValue({ id: 'u1', name: 'Marina', email: '', companyId: 'c1' })
    vi.mocked(getCompanyComplianceStatus).mockReset().mockResolvedValue('UNDER_REVIEW')
  })
  it.each([
    ['PENDING', 'Seu cadastro está em análise'],
    ['UNDER_REVIEW', 'Seu cadastro está em análise'],
    ['APPROVED', 'Cadastro aprovado'],
    ['REJECTED', 'Cadastro não aprovado'],
  ] as const)('renders the backend state %s', async (status, heading) => {
    vi.mocked(getCompanyComplianceStatus).mockResolvedValue(status)
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando situação cadastral...')
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(getCompanyComplianceStatus).toHaveBeenCalledWith('c1', expect.any(AbortSignal))
  })
  it('refreshes from review to approved and opens the platform', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Seu cadastro está em análise' })
    vi.mocked(getCompanyComplianceStatus).mockResolvedValue('APPROVED')
    await user.click(screen.getByRole('button', { name: 'Atualizar status' }))
    await user.click(await screen.findByRole('button', { name: 'Acessar plataforma' }))
    expect(screen.getByText('Plataforma')).toBeInTheDocument()
  })
  it('shows an error and retries without presenting a fabricated status', async () => {
    vi.mocked(getCompanyComplianceStatus).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a situação cadastral',
    )
    expect(screen.queryByText('Seu cadastro está em análise')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(
      await screen.findByRole('heading', { name: 'Seu cadastro está em análise' }),
    ).toBeInTheDocument()
  })
  it('handles an account without a company', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina',
      email: '',
      companyId: '',
    })
    renderPage()
    await screen.findByRole('alert')
    expect(getCompanyComplianceStatus).not.toHaveBeenCalled()
  })
  it('cancels an in-flight request when the page unmounts', () => {
    vi.mocked(getCurrentUser).mockReturnValue(new Promise(() => {}))
    const { unmount } = renderPage()
    const signal = vi.mocked(getCurrentUser).mock.calls[0][0]
    unmount()
    expect(signal?.aborted).toBe(true)
  })
  it('opens registration from a rejected status', async () => {
    vi.mocked(getCompanyComplianceStatus).mockResolvedValue('REJECTED')
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Revisar dados' }))
    expect(screen.getByText('Cadastro')).toBeInTheDocument()
  })
})
