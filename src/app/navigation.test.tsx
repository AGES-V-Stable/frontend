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
  // Proprietário com todas as capacidades; cada teste troca o vínculo quando precisa.
  companyAccess: {
    membershipId: 'm1',
    companyId: 'c1',
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: [
      'COMPANY_READ',
      'BALANCE_READ',
      'BENEFICIARY_READ',
      'TRANSFER_READ',
      'SELF_MEMBERSHIP_READ',
      'BENEFICIARY_WRITE',
      'TRANSFER_CREATE',
      'MEMBERS_READ',
      'MEMBERS_MANAGE',
    ],
    version: 1,
  },
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
let backend: (url: string) => Promise<Response>
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
  backend = async (url: string) => {
    if (url === '/v1/users/me')
      return new Response(
        JSON.stringify({
          ...user,
          accountType: role,
          companyId: role === 'ADMIN' ? null : 'c1',
          companyAccess: role === 'ADMIN' ? null : user.companyAccess,
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
    if (url === '/v1/balance') return new Response('{"availableBalanceBrl":"25000.00"}')
    if (url.includes('/dashboard/summary'))
      return new Response(
        JSON.stringify({
          currency: 'BRL',
          startDate: null,
          endDate: null,
          amount: '0.00',
          referenceSpreadPercentage: '4.00',
          averageEffectiveSpreadPercentage: null,
          incomplete: false,
          incompleteOperations: 0,
        }),
      )
    if (url.includes('/dashboard/settlements'))
      return new Response(
        JSON.stringify({ content: [], number: 0, size: 5, totalElements: 0, totalPages: 0 }),
      )
    if (url.includes('/dashboard/remittance-volume') || url.includes('/dashboard/savings-history'))
      return new Response(
        JSON.stringify({
          currency: 'BRL',
          granularity: 'MONTH',
          startDate: null,
          endDate: null,
          total: '0.00',
          points: [],
          incompleteOperations: 0,
        }),
      )
    if (url.startsWith('/v1/dashboard/transaction-volume'))
      return new Response('{"transactedVolumeBrl":"5022.50"}')
    throw new Error(`Unexpected test request: ${url}`)
  }
  mock = vi.fn(backend)
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
it('renders the company menu with real company identity and available actions', async () => {
  saveLoginToken('login')
  renderRoute()
  const nav = await screen.findByRole('navigation')
  expect(within(nav).getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(nav).queryByText('Clientes PME')).not.toBeInTheDocument()
  expect(screen.getByText('Empresa de Teste')).toBeInTheDocument()
  expect(screen.getByText('CNPJ: 12.345.678/0001-90')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Configurações' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Suporte' })).toBeEnabled()
})
it('opens the company dashboard from the Dashboard item, with balance and transacted volume', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')
  await screen.findByText('Atlas')

  await userEvent.click(within(nav).getByRole('button', { name: 'Dashboard' }))

  expect(await screen.findByText('R$ 25.000,00')).toBeInTheDocument()
  expect(await screen.findByText('R$ 5.022,50')).toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
  expect(within(nav).getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
it('opens the administrative dashboard from the Dashboard item', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/admin/clientes-pme')
  const nav = await screen.findByRole('navigation')

  await userEvent.click(within(nav).getByRole('button', { name: 'Dashboard' }))

  expect(
    await screen.findByRole('heading', { name: 'Dashboard Administrativo' }),
  ).toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard')
  // O admin não consulta saldo nem volume, que pertencem à empresa do cliente.
  expect(mock.mock.calls.some(([url]) => url === '/v1/balance')).toBe(false)
  expect(mock.mock.calls.some(([url]) => String(url).startsWith('/v1/dashboard/'))).toBe(false)
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
  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/summaries')).toBe(false)
})
it('redirects an admin away from company content', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/app/beneficiarios')
  await screen.findByRole('heading', { name: 'Dashboard Administrativo' })
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
it('warns about an expired session and returns to the protected page after logging in again', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')
  mock.mockResolvedValueOnce(new Response('{"code":"TOKEN_EXPIRED"}', { status: 401 }))
  await act(async () => {
    await httpRequest('/v1/expired').catch(() => undefined)
  })
  expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument()
  mock.mockImplementation(async (url: string) => {
    if (url === '/v1/auth/login')
      return new Response(null, { headers: { Authorization: 'Bearer renewed' } })
    if (url === '/v1/onboarding/me') return new Response('{}', { status: 404 })
    return backend(url)
  })

  await userEvent.type(screen.getByLabelText('E-mail'), 'marina@example.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-valida')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

  await screen.findByText('Atlas')
  expect(screen.getByTestId('location')).toHaveTextContent('/app/beneficiarios')
  expect(getLoginToken()).toBe('renewed')
})
it('warns about an expired session when the backend rejects the token while loading the account', async () => {
  saveLoginToken('expired')
  mock.mockResolvedValueOnce(new Response('{"code":"TOKEN_INVALID"}', { status: 401 }))

  renderRoute('/app/beneficiarios')

  expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument()
  expect(getLoginToken()).toBeNull()
})
it('does not warn about an expired session after a manual logout', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')

  act(() => clearLoginToken())

  await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })
  expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument()
})
it('provides a retry when identity loading fails', async () => {
  saveLoginToken('login')
  mock.mockRejectedValueOnce(new TypeError('offline'))
  renderRoute()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
})
it('reacts to logout and clears cached account identity', async () => {
  saveLoginToken('login')
  renderRoute()
  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
  act(() => clearLoginToken())
  await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })
  expect(screen.queryByText('Empresa de Teste')).not.toBeInTheDocument()
})
it('logs out from the account menu and returns to the login page', async () => {
  saveLoginToken('login')
  renderRoute()
  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await screen.findByRole('heading', { name: 'Bem-vindo à V-Stable!' })
  expect(getLoginToken()).toBeNull()
  expect(screen.getByTestId('location')).toHaveTextContent('/login')
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

it('selects the administrator menu from localStorage even when /me reports a user profile', async () => {
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute()
  await screen.findByRole('heading', { name: 'Dashboard Administrativo' })
  expect(screen.getByText('Painel administrativo')).toBeInTheDocument()
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/c1')).toBe(false)
})
it('uses the company navigation when the stored token is not an admin despite /me reporting ADMIN', async () => {
  role = 'ADMIN'
  saveLoginToken(`header.${btoa(JSON.stringify({ account_type: 'USER' }))}.signature`)
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ ...user, accountType: 'ADMIN' })))
  renderRoute('/admin/clientes-pme')
  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
  expect(screen.queryByText('Painel administrativo')).not.toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
})

it('allows an administrator to access settings without being redirected away', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/app/configuracoes')
  await screen.findByRole('heading', { name: 'Configurações da Conta' })
  expect(screen.getByRole('button', { name: 'Configurações' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByTestId('location')).toHaveTextContent('/app/configuracoes')
})

it('opens settings from the company menu', async () => {
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')
  await userEvent.click(within(nav).getByRole('button', { name: 'Configurações' }))
  expect(await screen.findByRole('heading', { name: 'Configurações da Conta' })).toBeInTheDocument()
  expect(within(nav).getByRole('button', { name: 'Configurações' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

it('opens members from the company menu with the same content as the direct route', async () => {
  mock.mockImplementation(async (url: string) =>
    url === '/v1/users/me'
      ? new Response(JSON.stringify({ ...user, companyAccess: null }))
      : backend(url),
  )
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')
  await userEvent.click(within(nav).getByRole('button', { name: 'Membros' }))
  expect(await screen.findByRole('heading', { name: 'Membros da empresa' })).toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/app/membros')
  expect(within(nav).getByRole('button', { name: 'Membros' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  // Sem vínculo de proprietário na sessão, nenhuma lista de terceiros é consultada.
  expect(
    screen.getByText('A gestão de membros é exclusiva do proprietário da empresa.'),
  ).toBeVisible()
  expect(mock.mock.calls.some(([url]) => String(url).includes('/members'))).toBe(false)
})

const ownMembership = (companyRole: string, status = 'ACTIVE') => ({
  id: 'm2',
  userId: 'u1',
  companyId: 'c1',
  name: 'Marina Costa',
  email: 'marina@example.com',
  role: companyRole,
  status,
  version: 1,
  joinedAt: '2026-11-01T12:00:00Z',
  removedAt: status === 'REMOVED' ? '2026-11-12T12:00:00Z' : null,
})
/** Sessão de um membro convidado; removido, a conta fica sem empresa. */
function mockMember(companyRole: string, status = 'ACTIVE') {
  const companyAccess = {
    membershipId: 'm2',
    companyId: 'c1',
    role: companyRole,
    status,
    permissions: status === 'ACTIVE' ? ['COMPANY_READ', 'SELF_MEMBERSHIP_READ'] : [],
    version: 1,
  }
  mock.mockImplementation(async (url: string) => {
    if (url === '/v1/users/me')
      return new Response(
        JSON.stringify({
          ...user,
          companyId: status === 'ACTIVE' ? 'c1' : null,
          companyAccess,
        }),
      )
    if (url === '/v1/companies/c1/members/me')
      return new Response(JSON.stringify(ownMembership(companyRole, status)))
    return backend(url)
  })
}
const memberRequests = () =>
  mock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/members'))

it.each(['OPERATOR', 'VIEWER'])(
  'given a %s, then the menu and the direct URL show only the own access, without management',
  async (companyRole) => {
    mockMember(companyRole)
    saveLoginToken('login')
    renderRoute('/app/beneficiarios')
    const nav = await screen.findByRole('navigation')
    // O título empresarial da tela 16 pertence às telas de membros.
    expect(screen.queryByText('V-Stable • Conta empresarial')).not.toBeInTheDocument()

    await userEvent.click(within(nav).getByRole('button', { name: 'Membros' }))

    expect(await screen.findByRole('heading', { name: 'Seu acesso à empresa' })).toBeVisible()
    expect(screen.getByTestId('location')).toHaveTextContent('/app/membros')
    expect(await screen.findByRole('region', { name: 'Seu acesso à empresa' })).toBeVisible()
    expect(screen.getByText('Você está acessando como membro')).toBeVisible()
    expect(screen.getByText('V-Stable • Conta empresarial')).toBeVisible()
    expect(screen.getByText('Marina Costa • MC')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument()
    expect(memberRequests()).toEqual(['/v1/companies/c1/members/me'])
  },
)

it.each(['OPERATOR', 'VIEWER'])(
  'given a %s opening the members URL directly, then it shows the same own access as the menu',
  async (companyRole) => {
    mockMember(companyRole)
    saveLoginToken('login')
    renderRoute('/app/membros')

    expect(await screen.findByRole('region', { name: 'Seu acesso à empresa' })).toBeVisible()
    expect(screen.getByText('Você está acessando como membro')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Adicionar|Gerenciar/ })).not.toBeInTheDocument()
    expect(memberRequests()).toEqual(['/v1/companies/c1/members/me'])
  },
)

it.each(['/app/membros', '/app/beneficiarios'])(
  'given the owner arriving from %s, then the direct URL and the menu show the same member list',
  async (path) => {
    const companyAccess = {
      membershipId: 'm1',
      companyId: 'c1',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['COMPANY_READ', 'MEMBERS_READ', 'MEMBERS_MANAGE'],
      version: 1,
    }
    mock.mockImplementation(async (url: string) => {
      if (url === '/v1/users/me') return new Response(JSON.stringify({ ...user, companyAccess }))
      if (url.startsWith('/v1/companies/c1/members?'))
        return new Response(
          JSON.stringify({
            items: [{ kind: 'MEMBER', member: { ...ownMembership('OWNER'), id: 'm1' } }],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
            summary: { activeMembers: 1, pendingInvitations: 0, peopleCount: 1 },
          }),
        )
      return backend(url)
    })
    saveLoginToken('login')
    renderRoute(path)
    const nav = await screen.findByRole('navigation')
    if (path !== '/app/membros')
      await userEvent.click(within(nav).getByRole('button', { name: 'Membros' }))

    expect(await screen.findByRole('heading', { name: 'Sua equipe começa aqui' })).toBeVisible()
    expect(screen.getByTestId('location')).toHaveTextContent('/app/membros')
    expect(within(screen.getByRole('table')).getByText('Proprietário da empresa')).toBeVisible()
    expect(screen.getByText('V-Stable • Conta empresarial')).toBeVisible()
    expect(screen.getByText('Marina Costa • MC')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Adicionar membro' })).toBeEnabled()
    expect(memberRequests()).toEqual(['/v1/companies/c1/members?page=0&size=20'])
  },
)

it('given a removed membership, then the members URL shows the lost access without loading the company', async () => {
  mockMember('OPERATOR', 'REMOVED')
  saveLoginToken('login')
  renderRoute('/app/membros')

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Seu acesso a esta empresa foi removido.',
  )
  expect(await screen.findByText('Acesso removido')).toBeVisible()
  const nav = screen.getByRole('navigation')
  expect(within(nav).getByRole('button', { name: 'Membros' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(within(nav).queryByRole('button', { name: 'Transferências' })).not.toBeInTheDocument()
  expect(mock.mock.calls.some(([url]) => url === '/v1/companies/c1')).toBe(false)
  expect(memberRequests()).toEqual(['/v1/companies/c1/members/me'])
})

it('given a removed membership, then company pages report the lost access and lead to the own access', async () => {
  mockMember('OPERATOR', 'REMOVED')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')

  expect(await screen.findByRole('alert')).toHaveTextContent('Seu acesso à empresa foi removido.')
  expect(mock.mock.calls.some(([url]) => String(url).includes('/beneficiaries'))).toBe(false)

  await userEvent.click(screen.getByRole('link', { name: 'Ver meu acesso' }))

  expect(await screen.findByRole('heading', { name: 'Seu acesso à empresa' })).toBeVisible()
  expect(screen.getByTestId('location')).toHaveTextContent('/app/membros')
})

it('keeps administrators out of the company members page', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/app/membros')
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard'))
  expect(screen.queryByRole('heading', { name: 'Membros da empresa' })).not.toBeInTheDocument()
  expect(mock.mock.calls.some(([url]) => String(url).includes('/members'))).toBe(false)
})

const ACTIVE_PERMISSIONS = [
  'COMPANY_READ',
  'BALANCE_READ',
  'BENEFICIARY_READ',
  'TRANSFER_READ',
  'SELF_MEMBERSHIP_READ',
]
const OPERATION_PERMISSIONS = ['BENEFICIARY_WRITE', 'TRANSFER_CREATE']
/** Sessão conforme a matriz de capacidades do backend. `current` pode mudar durante o teste. */
function mockProfile(initial: 'OWNER' | 'OPERATOR' | 'VIEWER' | 'REMOVED') {
  const state = { current: initial }
  mock.mockImplementation(async (url: string) => {
    if (url !== '/v1/users/me') return backend(url)
    const profile = state.current
    const removed = profile === 'REMOVED'
    return new Response(
      JSON.stringify({
        ...user,
        companyId: removed ? null : 'c1',
        companyAccess: {
          membershipId: 'm2',
          companyId: 'c1',
          role: removed ? 'OPERATOR' : profile,
          status: removed ? 'REMOVED' : 'ACTIVE',
          permissions: removed
            ? ['SELF_MEMBERSHIP_READ']
            : [
                ...ACTIVE_PERMISSIONS,
                ...(profile === 'VIEWER' ? [] : OPERATION_PERMISSIONS),
                ...(profile === 'OWNER' ? ['MEMBERS_READ', 'MEMBERS_MANAGE'] : []),
              ],
          version: 1,
        },
      }),
    )
  })
  return state
}
const requested = (fragment: string) =>
  mock.mock.calls.some(([url]) => String(url).includes(fragment))
const sessionLoads = () => mock.mock.calls.filter(([url]) => url === '/v1/users/me').length
/** Uma requisição autenticada qualquer é recusada pelo backend com o código informado. */
async function refuse(code: string, reloadsContext = true) {
  const loadsBefore = sessionLoads()
  mock.mockResolvedValueOnce(new Response(JSON.stringify({ code }), { status: 403 }))
  await act(async () => {
    await httpRequest('/v1/refused').catch(() => undefined)
    // Aguarda a consulta do contexto disparada pela recusa, sem depender de temporização.
    if (reloadsContext) await waitFor(() => expect(sessionLoads()).toBe(loadsBefore + 1))
  })
}

it('given a viewer, then it reads the company data without any action to create a beneficiary or a transfer', async () => {
  mockProfile('VIEWER')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')

  expect(await screen.findByText('Atlas')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Novo beneficiário' })).not.toBeInTheDocument()
  expect(within(nav).queryByRole('button', { name: 'Transferências' })).not.toBeInTheDocument()
  expect(within(nav).getByRole('button', { name: 'Membros' })).toBeEnabled()

  await userEvent.click(within(nav).getByRole('button', { name: 'Dashboard' }))
  expect(await screen.findByText('R$ 25.000,00')).toBeVisible()
})

it.each([
  ['/app/beneficiarios/novo', 'Seu perfil de acesso não permite cadastrar beneficiários.'],
  ['/app/transferencias/nova', 'Seu perfil de acesso não permite realizar transferências.'],
  ['/transferencias/nova', 'Seu perfil de acesso não permite realizar transferências.'],
])('given a viewer opening %s directly, then the action does not start', async (path, message) => {
  mockProfile('VIEWER')
  saveLoginToken('login')
  renderRoute(path)

  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.queryByRole('heading', { name: 'Cadastrar beneficiário' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Realizar transferência' })).not.toBeInTheDocument()
  expect(requested('/beneficiaries')).toBe(false)
  expect(requested('/v1/quotes')).toBe(false)

  await userEvent.click(screen.getByRole('link', { name: 'Ver meu acesso' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/app/membros')
})

it.each(['OWNER', 'OPERATOR'] as const)(
  'given the %s profile, then it starts the beneficiary registration and the transfer',
  async (profile) => {
    mockProfile(profile)
    saveLoginToken('login')
    renderRoute('/app/beneficiarios')
    const nav = await screen.findByRole('navigation')

    await userEvent.click(await screen.findByRole('button', { name: 'Novo beneficiário' }))
    expect(await screen.findByRole('heading', { name: 'Cadastrar beneficiário' })).toBeVisible()

    await userEvent.click(within(nav).getByRole('button', { name: 'Transferências' }))
    expect(await screen.findByRole('heading', { name: 'Realizar transferência' })).toBeVisible()
    expect(screen.queryByText(/Seu perfil de acesso não permite/)).not.toBeInTheDocument()
  },
)

it('given an operator, then no company profile opens the platform administration', async () => {
  mockProfile('OPERATOR')
  saveLoginToken('login')
  renderRoute('/admin/clientes-pme')

  await screen.findByRole('heading', { name: 'Visão Geral Corporativa' })
  expect(screen.getByTestId('location')).toHaveTextContent('/app/dashboard')
  expect(screen.queryByText('Clientes PME')).not.toBeInTheDocument()
  expect(requested('/v1/companies/summaries')).toBe(false)
})

it('given the profile was changed to viewer, when an action is refused, then the context reloads and the actions leave the screen without a new login', async () => {
  const profile = mockProfile('OPERATOR')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  const nav = await screen.findByRole('navigation')
  expect(await screen.findByRole('button', { name: 'Novo beneficiário' })).toBeVisible()

  profile.current = 'VIEWER'
  await refuse('PERMISSION_DENIED')

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Novo beneficiário' })).not.toBeInTheDocument(),
  )
  expect(within(nav).queryByRole('button', { name: 'Transferências' })).not.toBeInTheDocument()
  expect(screen.getByText('Atlas')).toBeVisible()
  expect(getLoginToken()).toBe('login')
  expect(screen.getByTestId('location')).toHaveTextContent('/app/beneficiarios')
})

it('given the profile was changed while registering a beneficiary, when the action is refused, then the form is withdrawn', async () => {
  const profile = mockProfile('OPERATOR')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios/novo')
  expect(await screen.findByRole('heading', { name: 'Cadastrar beneficiário' })).toBeVisible()

  profile.current = 'VIEWER'
  await refuse('PERMISSION_DENIED')

  expect(
    await screen.findByText('Seu perfil de acesso não permite cadastrar beneficiários.'),
  ).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Cadastrar beneficiário' })).not.toBeInTheDocument()
})

it('given the membership was revoked, when a request is refused, then the company data leaves the screen and the lost access is reported', async () => {
  const profile = mockProfile('OPERATOR')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')

  profile.current = 'REMOVED'
  await refuse('COMPANY_ACCESS_REVOKED')

  expect(await screen.findByText('Seu acesso à empresa foi removido.')).toBeVisible()
  expect(screen.queryByText('Atlas')).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  expect(getLoginToken()).toBe('login')
})

it('given a refusal without any change in the access, then the context is checked once and the page is kept', async () => {
  mockProfile('OPERATOR')
  saveLoginToken('login')
  renderRoute('/app/beneficiarios')
  await screen.findByText('Atlas')
  const requestsBefore = mock.mock.calls.length

  await refuse('PERMISSION_DENIED')

  await waitFor(() => expect(sessionLoads()).toBe(2))
  expect(screen.getByText('Atlas')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Novo beneficiário' })).toBeVisible()
  // Recusa + nova consulta do contexto: nenhuma tela é recarregada nem repete a requisição.
  expect(mock.mock.calls).toHaveLength(requestsBefore + 2)
})

it('given an administrator, when a request is refused, then the company context is not consulted', async () => {
  role = 'ADMIN'
  saveLoginToken(
    `header.${btoa(JSON.stringify({ account_type: 'ADMIN', role: ['ROLE_ADMIN'] }))}.signature`,
  )
  renderRoute('/admin/clientes-pme')
  await screen.findByRole('navigation')

  await refuse('PERMISSION_DENIED', false)

  expect(sessionLoads()).toBe(1)
  expect(screen.getByText('Painel administrativo')).toBeVisible()
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/clientes-pme')
})
