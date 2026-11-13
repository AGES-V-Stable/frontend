import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth'
import { Members } from './Members'

type Role = 'OWNER' | 'OPERATOR' | 'VIEWER'
type FakeMember = {
  id: string
  userId: string
  companyId: string
  name: string
  email: string
  role: Role
  status: 'ACTIVE' | 'REMOVED'
  version: number
  joinedAt: string
  removedAt: string | null
}
type Interceptor = (method: string, url: string) => Promise<Response> | Response | undefined

const LIST_URL = /^\/v1\/companies\/c1\/members\?page=(\d+)&size=(\d+)$/
const MEMBER_URL = /^\/v1\/companies\/c1\/members\/([^/?]+)$/

let members: FakeMember[]
let invitations: Record<string, unknown>[]
let accessRole: Role | null
let interceptor: Interceptor | null
let fetchMock: ReturnType<typeof vi.fn>

const newMember = (id: string, name: string, role: Role, version = 1): FakeMember => ({
  id,
  userId: `user-${id}`,
  companyId: 'c1',
  name,
  email: `${name.split(' ')[0]!.toLowerCase()}@empresa.com`,
  role,
  status: 'ACTIVE',
  version,
  joinedAt: '2026-11-01T12:00:00Z',
  removedAt: null,
})
const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), init)
const apiError = (status: number, code: string) =>
  json({ code, message: 'Mensagem do servidor' }, { status })

function listBody(page: number, size: number) {
  const active = members.filter((member) => member.status === 'ACTIVE')
  const items = [
    ...active.map((member) => ({ kind: 'MEMBER', member })),
    ...invitations.map((invitation) => ({ kind: 'INVITATION', invitation })),
  ]
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    summary: {
      activeMembers: active.length,
      pendingInvitations: invitations.length,
      peopleCount: items.length,
    },
  }
}

/** Mesmas regras do backend: If-Match obrigatório, versão divergente 412, vínculo inativo 404. */
async function backend(url: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET'
  const intercepted = interceptor?.(method, url)
  if (intercepted) return intercepted
  if (url === '/v1/users/me')
    return json({
      id: 'user-m1',
      name: 'Marina Costa',
      email: 'marina@empresa.com',
      companyId: 'c1',
      accountType: 'USER',
      roles: ['ROLE_USER'],
      companyAccess: accessRole && {
        membershipId: 'm1',
        companyId: 'c1',
        role: accessRole,
        status: 'ACTIVE',
        permissions: accessRole === 'OWNER' ? ['MEMBERS_READ', 'MEMBERS_MANAGE'] : [],
        version: 1,
      },
    })
  if (url === '/v1/companies/c1')
    return json({ id: 'c1', legalName: 'Empresa de Teste', tradeName: null, cnpj: '1' })
  const list = LIST_URL.exec(url)
  if (list && method === 'GET') return json(listBody(Number(list[1]), Number(list[2])))
  const target = MEMBER_URL.exec(url)
  if (target && (method === 'PATCH' || method === 'DELETE')) {
    // Mesma ordem de CompanyMemberController/CompanyMemberService (backend PRs #83/#84).
    const ifMatch = new Headers(init.headers as Record<string, string>).get('If-Match')
    if (!ifMatch) return apiError(428, 'VERSION_REQUIRED')
    const member = members.find((item) => item.id === target[1])
    if (!member) return apiError(404, 'MEMBER_NOT_FOUND')
    // DELETE repetido é idempotente: 204 mesmo com ETag antigo, sem reativar nada.
    if (method === 'DELETE' && member.status === 'REMOVED')
      return new Response(null, { status: 204 })
    if (member.role === 'OWNER') return apiError(409, 'OWNER_PROTECTED')
    if (member.status !== 'ACTIVE') return apiError(409, 'MEMBERSHIP_NOT_ACTIVE')
    if (ifMatch !== `"${member.version}"`) return apiError(412, 'RESOURCE_VERSION_MISMATCH')
    member.version += 1
    if (method === 'PATCH') {
      member.role = (JSON.parse(init.body as string) as { role: Role }).role
      return json(member, { headers: { ETag: `"${member.version}"` } })
    }
    member.status = 'REMOVED'
    member.removedAt = '2026-11-12T12:00:00Z'
    return new Response(null, { status: 204 })
  }
  throw new Error(`Unexpected test request: ${method} ${url}`)
}

const calls = (method: string, pattern: RegExp) =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      ((init as RequestInit | undefined)?.method ?? 'GET') === method &&
      pattern.test(url as string),
  )

function renderMembers() {
  localStorage.setItem('token', 'login-token')
  render(
    <SessionProvider>
      <Members />
    </SessionProvider>,
  )
}

const row = (name: string) =>
  within(screen.getByRole('table')).getByText(name).closest('tr') as HTMLElement

async function openManage(name: string) {
  const user = userEvent.setup()
  await within(await screen.findByRole('table')).findByText(name)
  await user.click(within(row(name)).getByRole('button', { name: 'Gerenciar' }))
  return { user, dialog: screen.getByRole('dialog', { name: 'Gerenciar membro' }) }
}

beforeEach(() => {
  members = [
    newMember('m1', 'Marina Costa', 'OWNER'),
    newMember('m2', 'Ana Souza', 'OPERATOR', 3),
    newMember('m3', 'Carlos Lima', 'VIEWER'),
  ]
  invitations = [
    {
      id: 'i1',
      companyId: 'c1',
      name: 'Bruno Alves',
      email: 'bruno@empresa.com',
      role: 'VIEWER',
      status: 'PENDING',
      version: 1,
      createdBy: { id: 'user-m1', name: 'Marina Costa' },
      createdAt: '2026-11-02T12:00:00Z',
      acceptedAt: null,
      revokedAt: null,
    },
  ]
  accessRole = 'OWNER'
  interceptor = null
  fetchMock = vi.fn(backend)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('Members — listagem do proprietário', () => {
  it('given the owner, then it lists people with role, status and management only for other active members', async () => {
    renderMembers()

    await screen.findByText('Ana Souza')
    expect(screen.getByText('· 4 pessoas')).toBeInTheDocument()
    expect(within(row('Ana Souza')).getByText('Operador')).toBeInTheDocument()
    expect(within(row('Ana Souza')).getByText('Ativo')).toBeInTheDocument()
    expect(within(row('Bruno Alves')).getByText('Convite pendente')).toBeInTheDocument()
    expect(within(row('Bruno Alves')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(row('Carlos Lima')).getByRole('button', { name: 'Gerenciar' })).toBeEnabled()
  })

  it('given the owner row, then it never offers to demote or remove themselves', async () => {
    renderMembers()

    await screen.findByText('Ana Souza')
    const ownerRow = row('Marina Costa')
    expect(within(ownerRow).getByText('(você)')).toBeInTheDocument()
    expect(within(ownerRow).getByText('Proprietário da empresa')).toBeInTheDocument()
    expect(within(ownerRow).queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument()
  })

  it('given the list fails to load, when retrying, then it shows the members', async () => {
    let failures = 1
    interceptor = (_, url) =>
      LIST_URL.test(url) && failures-- > 0 ? apiError(500, 'INTERNAL_ERROR') : undefined
    renderMembers()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os membros da empresa.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Members — alterar perfil', () => {
  it('opens Gerenciar membro with name, e-mail, current role and an exclusive Operador/Visualizador choice', async () => {
    renderMembers()
    const { dialog } = await openManage('Ana Souza')

    expect(within(dialog).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(dialog).getByText('ana@empresa.com')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Perfil atual: Operador')
    expect(within(dialog).getByRole('radio', { name: /Operador/ })).toBeChecked()
    expect(within(dialog).getByRole('radio', { name: /Visualizador/ })).not.toBeChecked()
    expect(within(dialog).queryByRole('radio', { name: /Proprietário/ })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  })

  it('given a new role, when saving, then it persists with If-Match and refreshes the list', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')

    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Perfil de Ana Souza alterado para Visualizador.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [[, init]] = calls('PATCH', MEMBER_URL) as [string, RequestInit][]
    expect(new Headers(init.headers as Record<string, string>).get('If-Match')).toBe('"3"')
    expect(JSON.parse(init.body as string)).toEqual({ role: 'VIEWER' })
    await waitFor(() =>
      expect(within(row('Ana Souza')).getByText('Visualizador')).toBeInTheDocument(),
    )
    expect(calls('GET', LIST_URL)).toHaveLength(2)
  })

  it('given a changed selection, when cancelling or pressing Escape, then the membership is not changed', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')

    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(within(row('Ana Souza')).getByRole('button', { name: 'Gerenciar' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(row('Ana Souza')).getByText('Operador')).toBeInTheDocument()
    expect(calls('PATCH', MEMBER_URL)).toHaveLength(0)
    expect(calls('DELETE', MEMBER_URL)).toHaveLength(0)
  })

  it('given a network failure, when saving, then it keeps the dialog and selection and allows a new attempt', async () => {
    let failures = 1
    interceptor = (method) => {
      if (method === 'PATCH' && failures-- > 0) throw new TypeError('Failed to fetch')
      return undefined
    }
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')

    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Tente novamente.',
    )
    expect(within(dialog).getByRole('radio', { name: /Visualizador/ })).toBeChecked()
    expect(within(row('Ana Souza')).getByText('Operador')).toBeInTheDocument()
    expect(calls('GET', LIST_URL)).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText(/alterado para Visualizador/)).toBeInTheDocument()
  })

  it('given the member was changed in another session, when saving, then it reloads the list without a false success', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')
    // Outra sessão alterou o vínculo depois da listagem.
    members[1]!.role = 'VIEWER'
    members[1]!.version = 4

    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este membro foi alterado em outra sessão. A lista foi atualizada; revise e tente novamente.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/alterado para/)).not.toBeInTheDocument()
    await waitFor(() =>
      expect(within(row('Ana Souza')).getByText('Visualizador')).toBeInTheDocument(),
    )
  })

  it('given the owner lost the permission, when saving, then it explains it without reloading', async () => {
    interceptor = (method) => (method === 'PATCH' ? apiError(403, 'OWNER_REQUIRED') : undefined)
    renderMembers()
    const { user, dialog } = await openManage('Carlos Lima')

    await user.click(within(dialog).getByRole('radio', { name: /Operador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para gerenciar membros desta empresa.',
    )
    expect(calls('GET', LIST_URL)).toHaveLength(1)
  })

  it('given a save in progress, when clicking again, then only one request is sent', async () => {
    let release: (response: Response) => void = () => undefined
    interceptor = (method) =>
      method === 'PATCH' ? new Promise<Response>((resolve) => (release = resolve)) : undefined
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')
    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    const save = within(dialog).getByRole('button', { name: 'Salvar alterações' })

    await act(async () => {
      save.click()
      save.click()
    })

    expect(within(dialog).getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(calls('PATCH', MEMBER_URL)).toHaveLength(1)

    await act(async () => release(json({ ...members[1], role: 'VIEWER', version: 4 })))
    expect(await screen.findByText(/alterado para Visualizador/)).toBeInTheDocument()
  })
})

describe('Members — remover membro', () => {
  it('asks for confirmation and keeps the member when choosing Manter membro', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')

    await user.click(within(dialog).getByRole('button', { name: 'Remover membro' }))

    const confirm = screen.getByRole('dialog', { name: 'Remover acesso de Ana Souza?' })
    expect(confirm).toHaveTextContent('perderá o acesso à empresa')
    expect(confirm).toHaveTextContent(
      'A conta pessoal e o histórico de operações serão preservados.',
    )
    await user.click(within(confirm).getByRole('button', { name: 'Manter membro' }))

    expect(screen.getByRole('dialog', { name: 'Gerenciar membro' })).toBeInTheDocument()
    expect(calls('DELETE', MEMBER_URL)).toHaveLength(0)
  })

  it('given the confirmation, then it removes the access with If-Match and refreshes the list', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')

    await user.click(within(dialog).getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByRole('button', { name: 'Remover acesso' }))

    expect(
      await screen.findByText('O acesso de Ana Souza à empresa foi removido.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument())
    expect(screen.getByText('· 3 pessoas')).toBeInTheDocument()
    const [[, init]] = calls('DELETE', MEMBER_URL) as [string, RequestInit][]
    expect(new Headers(init.headers as Record<string, string>).get('If-Match')).toBe('"3"')
  })

  it('given a failure, when removing, then it keeps the member and allows a new attempt', async () => {
    let failures = 1
    interceptor = (method) =>
      method === 'DELETE' && failures-- > 0 ? apiError(500, 'INTERNAL_ERROR') : undefined
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')
    await user.click(within(dialog).getByRole('button', { name: 'Remover membro' }))
    const confirm = screen.getByRole('dialog', { name: 'Remover acesso de Ana Souza?' })

    await user.click(within(confirm).getByRole('button', { name: 'Remover acesso' }))

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Não foi possível remover o acesso. Tente novamente.',
    )
    expect(within(row('Ana Souza')).getByText('Ativo')).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Remover acesso' }))
    expect(await screen.findByText(/foi removido/)).toBeInTheDocument()
  })

  it('given the member was removed in another session, when confirming, then the idempotent 204 refreshes the list', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')
    // Outra sessão já removeu o vínculo; o backend responde 204 mesmo com o ETag antigo.
    members[1]!.status = 'REMOVED'
    members[1]!.version = 4

    await user.click(within(dialog).getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByRole('button', { name: 'Remover acesso' }))

    expect(await screen.findByText('O acesso de Ana Souza à empresa foi removido.')).toBeVisible()
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument())
    expect(calls('DELETE', MEMBER_URL)).toHaveLength(1)
  })

  it('given the member was removed in another session, when saving a role, then it refreshes the list without a false success', async () => {
    renderMembers()
    const { user, dialog } = await openManage('Ana Souza')
    members[1]!.status = 'REMOVED'

    await user.click(within(dialog).getByRole('radio', { name: /Visualizador/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este membro não faz mais parte da empresa. A lista foi atualizada.',
    )
    expect(screen.queryByText(/alterado para/)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument())
  })

  it('given the only member of the last page is removed, then it returns to the previous page', async () => {
    members = [
      newMember('m1', 'Marina Costa', 'OWNER'),
      ...Array.from({ length: 20 }, (_, index) =>
        newMember(`x${index + 10}`, `Membro ${index + 10}`, 'OPERATOR'),
      ),
    ]
    invitations = []
    renderMembers()
    await screen.findByText('Membro 10')
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    const { user, dialog } = await openManage('Membro 29')

    await user.click(within(dialog).getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByRole('button', { name: 'Remover acesso' }))

    expect(await screen.findByText('Membro 10')).toBeInTheDocument()
    expect(screen.queryByText('Membro 29')).not.toBeInTheDocument()
    expect(calls('GET', /members\?page=0/).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Members — autorização', () => {
  it.each([['OPERATOR'], ['VIEWER'], [null]] as [Role | null][])(
    'given the %s profile, then it shows no list of third parties and no management actions',
    async (role) => {
      accessRole = role
      renderMembers()

      expect(
        await screen.findByText('A gestão de membros é exclusiva do proprietário da empresa.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument()
      expect(calls('GET', LIST_URL)).toHaveLength(0)
    },
  )
})
