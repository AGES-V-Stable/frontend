import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountProvider } from '../Account/AccountProvider'
import { AccountHeader } from '../Account/AccountHeader'

import { PATHS } from '@/app/routes/paths'
import { getCurrentUser } from '@/shared/services/user'
import { NavBar } from './NavBar'

vi.mock('@/shared/services/company', () => ({
  getCompany: vi.fn().mockResolvedValue({
    id: 'c1',
    legalName: 'Empresa Teste',
    cnpj: '04933111000190',
    availableBalanceBrl: 100,
  }),
}))

vi.mock('@/shared/services/user', () => ({ getCurrentUser: vi.fn() }))

function storeRole(role: string | string[]) {
  localStorage.setItem('token', `header.${btoa(JSON.stringify({ role }))}.signature`)
}

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>
}

function renderNavBar(path: string = PATHS.HOME) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccountProvider>
        <NavBar />
        <AccountHeader />
      </AccountProvider>
      <Location />
    </MemoryRouter>,
  )
}

describe('NavBar', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset()
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      name: 'Marina Costa',
      email: 'marina@example.com',
      companyId: 'c1',
    })
  })

  it.each(['ADMIN', 'ROLE_ADMIN'])('selects the admin menu from the stored %s role', (role) => {
    storeRole([role])
    renderNavBar()

    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(
      within(navigation)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Início', 'Clientes PME', 'Auditoria', 'Configurações'])
    expect(screen.getByText('Administrador V-Stable')).toBeInTheDocument()
    expect(getCurrentUser).not.toHaveBeenCalled()
  })

  it('selects the PME menu even on an admin URL and loads the account centrally', async () => {
    storeRole(['USER'])
    renderNavBar(PATHS.ADMIN_CLIENTS)

    const navigation = screen.getByRole('navigation')
    expect(
      within(navigation)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Início', 'Beneficiários', 'Transferências', 'Configurações'])
    expect(await screen.findByText('Marina Costa • MC')).toBeInTheDocument()
    expect(await screen.findByText('Empresa Teste')).toBeInTheDocument()
    expect(screen.getByText('CNPJ: 04.933.111/0001-90')).toBeInTheDocument()
  })

  it.each([
    ['Início', PATHS.HOME],
    ['Clientes PME', PATHS.ADMIN_CLIENTS],
    ['Auditoria', PATHS.ADMIN_AUDIT],
  ])('navigates to the admin %s destination and updates selection', async (label, path) => {
    storeRole('ADMIN')
    const user = userEvent.setup()
    renderNavBar(PATHS.ADMIN_CLIENTS)

    await user.click(screen.getByRole('button', { name: label }))

    expect(screen.getByTestId('location')).toHaveTextContent(path)
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-current')),
    ).toHaveLength(1)
  })

  it.each([
    [PATHS.BENEFICIARIES, 'Beneficiários'],
    [PATHS.BENEFICIARIES_NEW, 'Beneficiários'],
    [PATHS.HOME, 'Início'],
  ])('selects the PME section at %s', async (path, label) => {
    storeRole(['USER'])
    renderNavBar(path)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
    await screen.findByText('Marina Costa • MC')
  })

  it.each([
    [PATHS.DEMO_HOME, 'Início'],
    [PATHS.DEMO_ADMIN_CLIENTS, 'Clientes PME'],
  ])('selects the admin section at demo URL %s', (path, label) => {
    storeRole(['ADMIN'])
    renderNavBar(path)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
  })

  it('supports keyboard navigation to PME destinations', async () => {
    storeRole(['USER'])
    const user = userEvent.setup()
    renderNavBar(PATHS.BENEFICIARIES_NEW)
    await screen.findByText('Marina Costa • MC')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Início' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('location')).toHaveTextContent(PATHS.HOME)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Beneficiários' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByTestId('location')).toHaveTextContent(PATHS.BENEFICIARIES)
  })

  it.each(['Marina', '   '])('handles single or empty account names', async (name) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', name, email: '', companyId: 'c1' })
    renderNavBar()

    await screen.findByText('Empresa Teste')
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    if (name.trim()) expect(screen.getByText('Marina • MA')).toBeInTheDocument()
  })

  it('cancels account loading when navigation unmounts', async () => {
    let resolveUser!: (value: Awaited<ReturnType<typeof getCurrentUser>>) => void
    vi.mocked(getCurrentUser).mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve
      }),
    )
    const { unmount } = renderNavBar()
    const signal = vi.mocked(getCurrentUser).mock.calls[0][0]

    unmount()
    resolveUser({ id: 'u1', name: 'Marina Costa', email: '', companyId: 'c1' })

    expect(signal?.aborted).toBe(true)
  })
})
