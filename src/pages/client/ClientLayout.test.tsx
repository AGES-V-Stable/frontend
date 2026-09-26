import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientLayout } from './ClientLayout'
import { getCurrentUser } from '@/services/user'

vi.mock('@/services/user', () => ({
  getCurrentUser: vi.fn(),
}))

const renderLayout = () =>
  render(
    <MemoryRouter>
      <ClientLayout>
        <p>Conteúdo da página</p>
      </ClientLayout>
    </MemoryRouter>,
  )

describe('ClientLayout', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading status while the current user is being fetched', () => {
    vi.mocked(getCurrentUser).mockReturnValue(new Promise(() => {}))

    renderLayout()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando...')
  })

  it('shows the user name once loaded', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
    })

    renderLayout()

    expect((await screen.findAllByText('Marina Costa')).length).toBeGreaterThan(0)
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument()
  })

  it('shows an alert when loading the current user fails', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('network down'))

    renderLayout()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados do usuário.',
    )
  })

  it('renders the sidebar navigation items', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
    })

    renderLayout()

    expect(await screen.findByText('Início')).toBeInTheDocument()
    expect(screen.getByText('Beneficiários')).toBeInTheDocument()
  })
})
