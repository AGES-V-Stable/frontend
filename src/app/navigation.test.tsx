import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '@/App'
import { saveLoginToken, getLoginToken, clearLoginToken } from '@/shared/http/authToken'
import { httpRequest } from '@/shared/http/httpClient'

const user = {
  id: 'u1',
  name: 'Marina Costa',
  email: 'marina@example.com',
  companyId: 'c1',
  accountType: 'USER',
  roles: ['ROLE_USER'],
}
const company = { id: 'c1', legalName: 'Empresa de Teste', tradeName: null, cnpj: '12345678000190' }
const beneficiary = {
  id: 'b1',
  companyId: 'c1',
  nickname: 'Atlas',
  receivingMethod: 'BANK_ACCOUNT',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
}
let role: 'ADMIN' | 'USER'
let mock: ReturnType<typeof vi.fn>
function Location() {
  return <p data-testid="location">{useLocation().pathname + useLocation().search}</p>
}
function renderRoute(path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  role = 'USER'
  sessionStorage.clear()
  mock = vi.fn(async (url: string) => {
    if (url.includes('/dashboard/summary'))
      return new Response(
        JSON.stringify({
          year: 2026,
          currency: 'BRL',
          amount: '0.00',
          knownSubtotal: '0.00',
          incomplete: false,
          undatedOperations: 0,
        }),
      )
    if (url.includes('/dashboard/settlements'))
      return new Response(
        JSON.stringify({ content: [], number: 0, size: 5, totalElements: 0, totalPages: 0 }),
      )
    if (url.includes('/dashboard/'))
      return new Response(
        JSON.stringify({ currency: 'BRL', period: 'SIX_MONTHS', points: [], undatedOperations: 0 }),
      )
    if (url === '/v1/users/me')
      return new Response(
        JSON.stringify({
          ...user,
          accountType: role,
          companyId: role === 'ADMIN' ? null : 'c1',
          roles: [role === 'ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER'],
        }),
      )
    if (url === '/v1/companies/c1') return new Response(JSON.stringify(company))
    if (url === '/v1/companies/summaries') return new Response('[]')
    if (url.startsWith('/v1/transfers?'))
      return new Response('{"content":[],"totalElements":0,"totalPages":0,"number":0}')
    if (url.includes('/beneficiaries?'))
      return new Response(
        JSON.stringify({
          content: [beneficiary],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        }),
      )
    if (url.endsWith('/beneficiaries/b1')) return new Response(JSON.stringify(beneficiary))
    throw new Error(`Unexpected test request: ${url}`)
  })
  vi.stubGlobal('fetch', mock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})
it('redirects anonymous visitors without mounting the account navigation', async () => {
  renderRoute('/admin/clientes-pme')
  expect(await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  expect(mock).not.toHaveBeenCalled()
})
it('keeps login and registration outside the account shell', () => {
  saveLoginToken('login')
  renderRoute('/register')
  expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})
it('renders the company menu with real company identity and disabled unavailable actions', async () => {
  saveLoginToken('login')
  renderRoute()
  const nav = await screen.findByRole('navigation')
  expect(within(nav).getByRole('button', { name: 'Início' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(nav).queryByText('Clientes PME')).not.toBeInTheDocument()
  expect(screen.getByText('Empresa de Teste')).toBeInTheDocument()
  expect(screen.getByText('CNPJ: 12.345.678/0001-90')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Configurações' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Suporte' })).toBeDisabled()
})
it('keeps the shell and identity across company pages', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')
  const aside = screen.getByLabelText('Menu da conta')
  await userEvent.click(within(nav).getByRole('button', { name: 'Transferências' }))
  expect(await screen.findByRole('heading', { name: 'Realizar transferência' })).toBeInTheDocument()
  expect(screen.getByLabelText('Menu da conta')).toBe(aside)
  expect(screen.getAllByRole('navigation')).toHaveLength(1)
  expect(mock.mock.calls.filter(([url]) => url === '/v1/users/me')).toHaveLength(1)
  expect(mock.mock.calls.filter(([url]) => url === '/v1/companies/c1')).toHaveLength(1)
})
it('uses the company-scoped detail endpoint from the shared beneficiary list', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')
  await userEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }))
  await waitFor(() =>
    expect(mock.mock.calls.some(([url]) => url === '/v1/companies/c1/beneficiaries/b1')).toBe(true),
  )
  expect(mock.mock.calls.some(([url]) => url === '/v1/beneficiaries/b1')).toBe(false)
})
it('renders the admin menu, expands auditing and updates selected children', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/admin/transferencias')
  const nav = await screen.findByRole('navigation')
  expect(within(nav).getByRole('button', { name: 'Auditoria' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(within(nav).getByRole('button', { name: 'Transferências' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByText('Painel administrativo')).toBeInTheDocument()
  expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument()
  await userEvent.click(within(nav).getByRole('button', { name: 'Beneficiários' }))
  await screen.findByText('Atlas')
  expect(within(nav).getByRole('button', { name: 'Beneficiários' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/c1')).toBe(false)
})
it('lets admins expand and collapse Auditoria from the clients landing', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute()
  const nav = await screen.findByRole('navigation')
  const group = within(nav).getByRole('button', { name: 'Auditoria' })
  expect(group).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(group)
  expect(group).toHaveAttribute('aria-expanded', 'true')
  await userEvent.click(group)
  expect(group).toHaveAttribute('aria-expanded', 'false')
})
it.each([
  '/beneficiarios?search=Atlas',
  '/beneficiarios/novo?source=legacy',
  '/transferencias?source=legacy',
])('redirects legacy %s with its query intact', async (path) => {
  saveLoginToken('login')
  renderRoute(path)
  await screen.findByRole('navigation')
  const expected = path.startsWith('/transferencias')
    ? '/app/transferencias/nova?source=legacy'
    : `/app${path}`
  expect(screen.getByTestId('location')).toHaveTextContent(expected)
})
it('preserves the transfer identifier and query when redirecting an old details URL', async () => {
  saveLoginToken('login')
  renderRoute('/transferencias/a%2Fb?source=legacy')
  await screen.findByRole('navigation')
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/app/transferencias/a%2Fb?source=legacy',
  )
})
it('redirects a company user away from administrator content', async () => {
  saveLoginToken('login')
  renderRoute('/admin/clientes-pme')
  await screen.findByRole('heading', { name: 'Conta empresarial' })
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/summaries')).toBe(false)
})
it('redirects an admin away from company content', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/app/beneficiarios')
  await screen.findByRole('heading', { name: 'Dashboard administrativo' })
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard')
})
it('clears the shell when an authenticated request expires', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')
  mock.mockResolvedValueOnce(new Response('{"code":"TOKEN_EXPIRED"}', { status: 401 }))
  await act(async () => {
    await httpRequest('/v1/expired').catch(() => undefined)
  })
  await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })
  expect(getLoginToken()).toBeNull()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})
it('provides a retry when identity loading fails', async () => {
  saveLoginToken('login')
  mock.mockRejectedValueOnce(new TypeError('offline'))
  renderRoute()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await screen.findByRole('heading', { name: 'Conta empresarial' })
})
it('reacts to logout and clears cached account identity', async () => {
  saveLoginToken('login')
  renderRoute()
  await screen.findByRole('heading', { name: 'Conta empresarial' })
  act(() => clearLoginToken())
  await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })
  expect(screen.queryByText('Empresa de Teste')).not.toBeInTheDocument()
})

it('selects the administrator menu from localStorage even when /me reports a user profile', async () => {
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute()
  await screen.findByRole('heading', { name: 'Dashboard administrativo' })
  expect(screen.getByText('Painel administrativo')).toBeInTheDocument()
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/c1')).toBe(false)
})
it('uses the company navigation when the stored token is not an admin despite /me reporting ADMIN', async () => {
  role = 'ADMIN'
  saveLoginToken(`header.${btoa(JSON.stringify({ account_type: 'USER' }))}.signature`)
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ ...user, accountType: 'ADMIN' })))
  renderRoute('/admin/clientes-pme')
  await screen.findByRole('heading', { name: 'Conta empresarial' })
  expect(screen.queryByText('Painel administrativo')).not.toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
})
