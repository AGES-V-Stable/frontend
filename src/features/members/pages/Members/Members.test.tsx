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
type FakeInvitation = {
  id: string
  companyId: string
  name: string
  email: string
  role: Role
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED'
  version: number
  createdBy: { id: string; name: string }
  createdAt: string
  acceptedAt: string | null
  revokedAt: string | null
}
type Interceptor = (method: string, url: string) => Promise<Response> | Response | undefined

const LIST_URL = /^\/v1\/companies\/c1\/members\?page=(\d+)&size=(\d+)$/
const MEMBER_URL = /^\/v1\/companies\/c1\/members\/([^/?]+)$/
const INVITATIONS_URL = /^\/v1\/companies\/c1\/invitations$/
const INVITATION_URL = /^\/v1\/companies\/c1\/invitations\/([^/?]+)$/
const LINK_URL = /^\/v1\/companies\/c1\/invitations\/([^/?]+)\/link$/
const REGENERATE_URL = /^\/v1\/companies\/c1\/invitations\/([^/?]+)\/regenerate$/
const inviteUrl = (token: string) => `https://app.example/convites/empresa#token=${token}`

let members: FakeMember[]
let invitations: FakeInvitation[]
/** Token vigente de cada convite pendente; nunca aparece na listagem. */
let tokens: Record<string, string>
let tokenSequence: number
let accessRole: Role | null
let accessRemoved: boolean
let selfLookupFailure: boolean
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
  const pending = invitations.filter((invitation) => invitation.status === 'PENDING')
  const items = [
    ...active.map((member) => ({ kind: 'MEMBER', member })),
    ...pending.map((invitation) => ({ kind: 'INVITATION', invitation })),
  ]
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    summary: {
      activeMembers: active.length,
      pendingInvitations: pending.length,
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
      companyId: accessRemoved ? null : 'c1',
      accountType: 'USER',
      roles: ['ROLE_USER'],
      companyAccess: accessRole && {
        membershipId: 'm1',
        companyId: 'c1',
        role: accessRole,
        status: accessRemoved ? 'REMOVED' : 'ACTIVE',
        permissions: accessRole === 'OWNER' && !accessRemoved ? ['MEMBERS_READ', 'MEMBERS_MANAGE'] : ['SELF_MEMBERSHIP_READ'],
        version: 1,
      },
    })
  if (url === '/v1/companies/c1')
    return json({ id: 'c1', legalName: 'Empresa de Teste', tradeName: null, cnpj: '1' })
  if (url === '/v1/companies/c1/members/me' && method === 'GET') {
    if (selfLookupFailure) return apiError(503, 'SERVICE_UNAVAILABLE')
    return json({
      ...newMember('m1', 'Marina Costa', accessRole ?? 'VIEWER'),
      userId: 'user-m1',
      status: accessRemoved ? 'REMOVED' : 'ACTIVE',
      removedAt: accessRemoved ? '2026-11-14T12:00:00Z' : null,
    })
  }
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
  const invitationResponse = invitationBackend(method, url, init)
  if (invitationResponse) return invitationResponse
  throw new Error(`Unexpected test request: ${method} ${url}`)
}

const newInvitation = (id: string, name: string, email: string, role: Role): FakeInvitation => ({
  id,
  companyId: 'c1',
  name,
  email,
  role,
  status: 'PENDING',
  version: 1,
  createdBy: { id: 'user-m1', name: 'Marina Costa' },
  createdAt: '2026-11-02T12:00:00Z',
  acceptedAt: null,
  revokedAt: null,
})

const issueToken = (invitation: FakeInvitation) => {
  tokenSequence += 1
  tokens[invitation.id] = `token-${tokenSequence}`
}

const generated = (invitation: FakeInvitation, status = 200) =>
  json(
    { invitation, inviteUrl: inviteUrl(tokens[invitation.id]!) },
    { status, headers: { ETag: `"${invitation.version}"`, 'Cache-Control': 'no-store' } },
  )

/** Mesmas regras de CompanyInvitationController/CompanyInvitationService (backend main). */
function invitationBackend(method: string, url: string, init: RequestInit): Response | undefined {
  const ifMatch = new Headers(init.headers as Record<string, string>).get('If-Match')
  const find = (id: string) => invitations.find((invitation) => invitation.id === id)

  if (INVITATIONS_URL.test(url) && method === 'POST') {
    const body = JSON.parse(init.body as string) as { name: string; email: string; role: Role }
    if (members.some((member) => member.status === 'ACTIVE' && member.email === body.email))
      return apiError(409, 'MEMBER_ALREADY_EXISTS')
    const existing = invitations.find(
      (invitation) => invitation.status === 'PENDING' && invitation.email === body.email,
    )
    if (existing)
      return json(
        {
          code: 'INVITATION_ALREADY_EXISTS',
          message: 'Já existe',
          details: { invitationId: existing.id },
        },
        { status: 409 },
      )
    const invitation = newInvitation(`i${invitations.length + 1}`, body.name, body.email, body.role)
    invitations.push(invitation)
    issueToken(invitation)
    return generated(invitation, 201)
  }

  const link = LINK_URL.exec(url)
  if (link && method === 'GET') {
    const invitation = find(link[1]!)
    if (!invitation) return apiError(404, 'INVITATION_NOT_FOUND')
    if (invitation.status === 'ACCEPTED') return apiError(409, 'INVITATION_ALREADY_USED')
    if (invitation.status === 'REVOKED') return apiError(410, 'INVITATION_REVOKED')
    return generated(invitation)
  }

  const regenerate = REGENERATE_URL.exec(url)
  if (regenerate && method === 'POST') {
    if (!ifMatch) return apiError(428, 'VERSION_REQUIRED')
    const invitation = find(regenerate[1]!)
    if (!invitation) return apiError(404, 'INVITATION_NOT_FOUND')
    if (invitation.status !== 'PENDING') return apiError(409, 'INVITATION_NOT_REGENERABLE')
    if (ifMatch !== `"${invitation.version}"`) return apiError(412, 'RESOURCE_VERSION_MISMATCH')
    invitation.version += 1
    issueToken(invitation)
    return generated(invitation)
  }

  const target = INVITATION_URL.exec(url)
  if (target && method === 'DELETE') {
    if (!ifMatch) return apiError(428, 'VERSION_REQUIRED')
    const invitation = find(target[1]!)
    if (!invitation) return apiError(404, 'INVITATION_NOT_FOUND')
    if (invitation.status === 'REVOKED') return new Response(null, { status: 204 })
    if (invitation.status === 'ACCEPTED') return apiError(409, 'INVITATION_ALREADY_USED')
    if (ifMatch !== `"${invitation.version}"`) return apiError(412, 'RESOURCE_VERSION_MISMATCH')
    invitation.status = 'REVOKED'
    invitation.version += 1
    delete tokens[invitation.id]
    return new Response(null, { status: 204 })
  }
  return undefined
}

const calls = (method: string, pattern: RegExp) =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      ((init as RequestInit | undefined)?.method ?? 'GET') === method &&
      pattern.test(url as string),
  )

function renderMembers() {
  localStorage.setItem('token', 'login-token')
  return render(
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
  invitations = [newInvitation('i1', 'Bruno Alves', 'bruno@empresa.com', 'VIEWER')]
  tokens = {}
  tokenSequence = 0
  issueToken(invitations[0]!)
  accessRole = 'OWNER'
  accessRemoved = false
  selfLookupFailure = false
  interceptor = null
  fetchMock = vi.fn(backend)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Members — listagem do proprietário', () => {
  it('given the owner, then it lists people with role, status and management only for other active members', async () => {
    renderMembers()

    await screen.findByText('Ana Souza')
    expect(screen.getByText('· 4 pessoas')).toBeInTheDocument()
    expect(within(row('Ana Souza')).getByText('Operador')).toBeInTheDocument()
    expect(within(row('Ana Souza')).getByText('Ativo')).toBeInTheDocument()
    expect(within(row('Bruno Alves')).getByText('Convite pendente')).toBeInTheDocument()
    expect(within(row('Bruno Alves')).getByRole('button', { name: 'Copiar link' })).toBeEnabled()
    expect(
      within(row('Bruno Alves')).getByRole('button', { name: 'Gerenciar convite' }),
    ).toBeEnabled()
    expect(
      within(row('Bruno Alves')).queryByRole('button', { name: 'Gerenciar' }),
    ).not.toBeInTheDocument()
    expect(within(row('Carlos Lima')).getByRole('button', { name: 'Gerenciar' })).toBeEnabled()
  })

  it('given only the owner is registered, then it offers to invite the first member', async () => {
    members = [members[0]!]
    invitations = []
    renderMembers()

    expect(await screen.findByText('Sua equipe começa aqui')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar membro' })).toBeEnabled()
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
  it.each(['OPERATOR', 'VIEWER'] as Role[])(
    'given the %s profile, then it shows only the own membership',
    async (role) => {
      accessRole = role
      renderMembers()

      expect(
        await screen.findByRole('heading', { name: 'Seu acesso à empresa' }),
      ).toBeInTheDocument()
      expect(await screen.findByText('Marina Costa')).toBeInTheDocument()
      expect(
        screen.getByText(role === 'OPERATOR' ? 'Operador' : 'Visualizador'),
      ).toBeInTheDocument()
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('Empresa de Teste')).toBeInTheDocument()
      expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Gerenciar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Adicionar membro' })).not.toBeInTheDocument()
      expect(calls('GET', LIST_URL)).toHaveLength(0)
      expect(calls('GET', /\/members\/me$/)).toHaveLength(1)
      expect(calls('GET', /\/invitations\//)).toHaveLength(0)
    },
  )

  it('given a removed membership, then it warns without listing colleagues', async () => {
    accessRole = 'VIEWER'
    accessRemoved = true
    renderMembers()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Seu acesso a esta empresa foi removido',
    )
    expect(screen.getByText('Acesso removido')).toBeInTheDocument()
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
    expect(calls('GET', LIST_URL)).toHaveLength(0)
    expect(calls('GET', /\/members\/me$/)).toHaveLength(1)
  })

  it('given a failed own-access lookup, then retry loads only the own membership', async () => {
    accessRole = 'OPERATOR'
    selfLookupFailure = true
    renderMembers()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível consultar seu vínculo',
    )
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
    selfLookupFailure = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Marina Costa')).toBeInTheDocument()
    expect(calls('GET', /\/members\/me$/)).toHaveLength(2)
    expect(calls('GET', LIST_URL)).toHaveLength(0)
  })

  it('given a user without a membership, then it does not fetch company members', async () => {
    accessRole = null
    renderMembers()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não existe vínculo empresarial')
    expect(calls('GET', LIST_URL)).toHaveLength(0)
    expect(calls('GET', /\/members\/me$/)).toHaveLength(0)
  })
})

/** Instala o stub de área de transferência do userEvent e observa as cópias. */
function setupUser(copy: () => Promise<void> = () => Promise.resolve()) {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(copy)
  return { user, writeText }
}

async function openInvite(copy?: () => Promise<void>) {
  const setup = setupUser(copy)
  await screen.findByText('Ana Souza')
  await setup.user.click(screen.getByRole('button', { name: 'Adicionar membro' }))
  return { ...setup, dialog: screen.getByRole('dialog', { name: 'Adicionar membro' }) }
}

async function fillInvite(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  email: string,
  role: RegExp,
) {
  await user.type(screen.getByLabelText('Nome'), name)
  await user.type(screen.getByLabelText('E-mail'), email)
  await user.click(screen.getByRole('radio', { name: role }))
}

async function openInvitation(name: string) {
  const setup = setupUser()
  await within(await screen.findByRole('table')).findByText(name)
  await setup.user.click(within(row(name)).getByRole('button', { name: 'Gerenciar convite' }))
  return { ...setup, dialog: screen.getByRole('dialog', { name: 'Gerenciar convite' }) }
}

const ifMatchOf = (init: RequestInit) =>
  new Headers(init.headers as Record<string, string>).get('If-Match')

function storedValues(): string[] {
  return [localStorage, sessionStorage].flatMap((storage) =>
    Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index) ?? ''
      return `${key}=${storage.getItem(key) ?? ''}`
    }),
  )
}

describe('Members — criar convite', () => {
  it('given valid data, when creating, then it shows the link, copies it on demand and lists the pending invitation', async () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      vi.spyOn(console, method),
    )
    renderMembers()
    const { user, writeText } = await openInvite()

    await fillInvite(user, '  Diana Reis ', 'Diana@Empresa.com', /Operador/)
    await user.click(screen.getByRole('button', { name: 'Criar convite' }))

    const created = await screen.findByRole('dialog', { name: 'Convite criado para Diana Reis' })
    const [[, init]] = calls('POST', INVITATIONS_URL) as [string, RequestInit][]
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Diana Reis',
      email: 'diana@empresa.com',
      role: 'OPERATOR',
    })
    expect(within(created).getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      inviteUrl('token-2'),
    )
    expect(writeText).not.toHaveBeenCalled()

    await user.click(within(created).getByRole('button', { name: 'Copiar link' }))
    expect(writeText).toHaveBeenCalledWith(inviteUrl('token-2'))
    expect(within(created).getByRole('status')).toHaveTextContent('Link copiado')

    await waitFor(() =>
      expect(within(row('Diana Reis')).getByText('Convite pendente')).toBeInTheDocument(),
    )
    expect(screen.getByText('· 5 pessoas')).toBeInTheDocument()
    expect(storedValues().join('\n')).not.toContain('token-2')
    for (const log of logs) expect(JSON.stringify(log.mock.calls)).not.toContain('token-2')
  })

  it('given a created invitation, when closing, then it is kept and the link leaves the screen', async () => {
    renderMembers()
    const { user } = await openInvite()
    await fillInvite(user, 'Diana Reis', 'diana@empresa.com', /Visualizador/)
    await user.click(screen.getByRole('button', { name: 'Criar convite' }))
    await screen.findByRole('dialog', { name: 'Convite criado para Diana Reis' })

    await user.click(screen.getByRole('button', { name: 'Concluir' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue(inviteUrl('token-2'))).not.toBeInTheDocument()
    await waitFor(() =>
      expect(within(row('Diana Reis')).getByText('Visualizador')).toBeInTheDocument(),
    )
    expect(calls('DELETE', INVITATION_URL)).toHaveLength(0)
  })

  it('given cancel or Escape before creating, then no invitation is created', async () => {
    renderMembers()
    const { user } = await openInvite()
    await fillInvite(user, 'Diana Reis', 'diana@empresa.com', /Operador/)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar membro' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('POST', INVITATIONS_URL)).toHaveLength(0)
  })

  it('given a reopened dialog, then the previous data is not kept', async () => {
    renderMembers()
    const { user } = await openInvite()
    await fillInvite(user, 'Diana Reis', 'diana@empresa.com', /Operador/)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Adicionar membro' }))

    expect(screen.getByLabelText('Nome')).toHaveValue('')
    expect(screen.getByLabelText('E-mail')).toHaveValue('')
  })

  it('given a creation in progress, when clicking again, then only one request is sent', async () => {
    let release: (response: Response) => void = () => undefined
    interceptor = (method, url) =>
      method === 'POST' && INVITATIONS_URL.test(url)
        ? new Promise<Response>((resolve) => (release = resolve))
        : undefined
    renderMembers()
    const { user, dialog } = await openInvite()
    await fillInvite(user, 'Diana Reis', 'diana@empresa.com', /Operador/)
    const submit = within(dialog).getByRole('button', { name: 'Criar convite' })

    await act(async () => {
      submit.click()
      submit.click()
    })

    expect(within(dialog).getByRole('button', { name: 'Criando convite...' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(calls('POST', INVITATIONS_URL)).toHaveLength(1)

    const invitation = newInvitation('i2', 'Diana Reis', 'diana@empresa.com', 'OPERATOR')
    await act(async () =>
      release(json({ invitation, inviteUrl: inviteUrl('token-9') }, { status: 201 })),
    )
    expect(
      await screen.findByRole('dialog', { name: 'Convite criado para Diana Reis' }),
    ).toBeInTheDocument()
  })

  it('given an e-mail of a current member, then it shows the inline error, keeps name and role and focuses the e-mail', async () => {
    renderMembers()
    const { user, dialog } = await openInvite()
    await fillInvite(user, 'Ana Nova', 'ana@empresa.com', /Visualizador/)

    await user.click(within(dialog).getByRole('button', { name: 'Criar convite' }))

    expect(
      await within(dialog).findByText('Este e-mail já pertence a um membro desta empresa.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Nova')
    expect(screen.getByRole('radio', { name: /Visualizador/ })).toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Corrigir e-mail' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('E-mail'))
    expect(
      within(dialog).queryByText('Este e-mail já pertence a um membro desta empresa.'),
    ).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('E-mail'), 'ana.nova@empresa.com')
    await user.click(within(dialog).getByRole('button', { name: 'Criar convite' }))
    expect(
      await screen.findByRole('dialog', { name: 'Convite criado para Ana Nova' }),
    ).toBeInTheDocument()
  })

  it('given an e-mail with a pending invitation, then it opens the existing invitation link without a new row', async () => {
    renderMembers()
    const { user } = await openInvite()
    await fillInvite(user, 'Bruno Outro', 'bruno@empresa.com', /Operador/)

    await user.click(screen.getByRole('button', { name: 'Criar convite' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Já existe um convite pendente para Bruno Alves',
    })
    expect(within(dialog).getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      inviteUrl('token-1'),
    )
    expect(calls('GET', /\/invitations\/i1\/link$/)).toHaveLength(1)
    expect(calls('POST', REGENERATE_URL)).toHaveLength(0)
    await waitFor(() => expect(calls('GET', LIST_URL)).toHaveLength(2))
    expect(screen.getByText('· 4 pessoas')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByText('Bruno Alves')).toHaveLength(1)
  })

  it('given the existing invitation link cannot be read, then it points to the list', async () => {
    interceptor = (_, url) => (LINK_URL.test(url) ? apiError(500, 'INTERNAL_ERROR') : undefined)
    renderMembers()
    const { user, dialog } = await openInvite()
    await fillInvite(user, 'Bruno Outro', 'bruno@empresa.com', /Operador/)

    await user.click(within(dialog).getByRole('button', { name: 'Criar convite' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Já existe um convite pendente para este e-mail.',
    )
    expect(calls('POST', INVITATIONS_URL)).toHaveLength(1)
  })

  it('given the owner lost the permission, then the backend refusal is explained', async () => {
    interceptor = (method, url) =>
      method === 'POST' && INVITATIONS_URL.test(url) ? apiError(403, 'OWNER_REQUIRED') : undefined
    renderMembers()
    const { user, dialog } = await openInvite()
    await fillInvite(user, 'Diana Reis', 'diana@empresa.com', /Operador/)

    await user.click(within(dialog).getByRole('button', { name: 'Criar convite' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para gerenciar convites desta empresa.',
    )
  })
})

describe('Members — copiar link do convite pendente', () => {
  it('given a reloaded page, when copying from the row, then it fetches the current link and never regenerates it', async () => {
    const first = renderMembers()
    const { user: creator } = await openInvite()
    await fillInvite(creator, 'Diana Reis', 'diana@empresa.com', /Operador/)
    await creator.click(screen.getByRole('button', { name: 'Criar convite' }))
    await screen.findByRole('dialog', { name: 'Convite criado para Diana Reis' })
    first.unmount()

    renderMembers()
    const { user, writeText } = setupUser()
    await within(await screen.findByRole('table')).findByText('Diana Reis')
    await user.click(within(row('Diana Reis')).getByRole('button', { name: 'Copiar link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Link copiado. Envie para Diana Reis.',
    )
    expect(writeText).toHaveBeenLastCalledWith(inviteUrl('token-2'))

    await user.click(within(row('Diana Reis')).getByRole('button', { name: 'Copiar link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(writeText).toHaveBeenLastCalledWith(inviteUrl('token-2'))
    expect(calls('GET', /\/invitations\/i2\/link$/)).toHaveLength(2)
    expect(calls('POST', REGENERATE_URL)).toHaveLength(0)
    expect(invitations[1]!.version).toBe(1)
  })

  it('given a copy in progress, then the row buttons are locked', async () => {
    let release: (response: Response) => void = () => undefined
    interceptor = (_, url) =>
      LINK_URL.test(url) ? new Promise<Response>((resolve) => (release = resolve)) : undefined
    renderMembers()
    const { user } = setupUser()
    await within(await screen.findByRole('table')).findByText('Bruno Alves')

    await user.click(within(row('Bruno Alves')).getByRole('button', { name: 'Copiar link' }))

    expect(within(row('Bruno Alves')).getByRole('button', { name: 'Copiando...' })).toBeDisabled()
    expect(
      within(row('Bruno Alves')).getByRole('button', { name: 'Gerenciar convite' }),
    ).toBeDisabled()
    await act(async () =>
      release(json({ invitation: invitations[0], inviteUrl: inviteUrl('token-1') })),
    )
    expect(await screen.findByText('Link copiado. Envie para Bruno Alves.')).toBeInTheDocument()
  })

  it('given the clipboard is blocked, then it opens the selectable link for a manual copy', async () => {
    renderMembers()
    const { user } = setupUser(() => Promise.reject(new Error('NotAllowedError')))
    await within(await screen.findByRole('table')).findByText('Bruno Alves')

    await user.click(within(row('Bruno Alves')).getByRole('button', { name: 'Copiar link' }))

    const dialog = await screen.findByRole('dialog', { name: 'Gerenciar convite' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Não foi possível copiar automaticamente. Selecione o link abaixo e copie manualmente.',
    )
    expect(within(dialog).getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      inviteUrl('token-1'),
    )
    expect(screen.queryByText(/Link copiado/)).not.toBeInTheDocument()
  })

  it.each([
    ['ACCEPTED', 'Este convite já foi aceito. A lista foi atualizada.'],
    ['REVOKED', 'Este convite foi revogado. A lista foi atualizada.'],
  ] as const)(
    'given the invitation was %s in another session, when copying, then it reloads the list',
    async (status, message) => {
      renderMembers()
      const { user, writeText } = setupUser()
      await within(await screen.findByRole('table')).findByText('Bruno Alves')
      invitations[0]!.status = status

      await user.click(within(row('Bruno Alves')).getByRole('button', { name: 'Copiar link' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      await waitFor(() => expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument())
      expect(writeText).not.toHaveBeenCalled()
    },
  )

  it('given a network failure, when copying, then it explains it without reloading', async () => {
    interceptor = (_, url) => {
      if (LINK_URL.test(url)) throw new TypeError('Failed to fetch')
      return undefined
    }
    renderMembers()
    const { user } = setupUser()
    await within(await screen.findByRole('table')).findByText('Bruno Alves')

    await user.click(within(row('Bruno Alves')).getByRole('button', { name: 'Copiar link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Tente novamente.',
    )
    expect(calls('GET', LIST_URL)).toHaveLength(1)
  })
})

describe('Members — gerar novo link', () => {
  it('given the confirmation, then it replaces the link with If-Match without duplicating the person', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')

    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    const confirm = screen.getByRole('dialog', { name: 'Gerar novo link para Bruno Alves?' })
    await user.click(within(confirm).getByRole('button', { name: 'Gerar novo link' }))

    const updated = await screen.findByRole('dialog', { name: 'Gerenciar convite' })
    expect(within(updated).getAllByRole('status')[0]).toHaveTextContent(
      'Novo link gerado. O link anterior não funciona mais.',
    )
    expect(within(updated).getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      inviteUrl('token-2'),
    )
    const [[, init]] = calls('POST', REGENERATE_URL) as [string, RequestInit][]
    expect(ifMatchOf(init)).toBe('"1"')
    expect(Object.values(tokens)).not.toContain('token-1')
    await waitFor(() => expect(calls('GET', LIST_URL)).toHaveLength(2))
    expect(screen.getByText('· 4 pessoas')).toBeInTheDocument()
  })

  it('given a regenerated link, when revoking next, then it sends the new version', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    await user.click(screen.getByRole('button', { name: 'Gerar novo link' }))
    await screen.findByText('Novo link gerado. O link anterior não funciona mais.')

    await user.click(screen.getByRole('button', { name: 'Revogar convite' }))
    await user.click(screen.getByRole('button', { name: 'Revogar convite' }))

    expect(
      await screen.findByText('Convite de Bruno Alves revogado. O link não funciona mais.'),
    ).toBeInTheDocument()
    const [[, init]] = calls('DELETE', INVITATION_URL) as [string, RequestInit][]
    expect(ifMatchOf(init)).toBe('"2"')
  })

  it('given Manter link atual, then the link is not replaced', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')

    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    await user.click(screen.getByRole('button', { name: 'Manter link atual' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('POST', REGENERATE_URL)).toHaveLength(0)
    expect(tokens.i1).toBe('token-1')
  })

  it('given the rate limit, then it tells how long to wait and keeps the current link', async () => {
    interceptor = (method, url) =>
      method === 'POST' && REGENERATE_URL.test(url)
        ? json(
            { code: 'INVITATION_RATE_LIMITED', message: 'Aguarde' },
            { status: 429, headers: { 'Retry-After': '45' } },
          )
        : undefined
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    const confirm = screen.getByRole('dialog', { name: 'Gerar novo link para Bruno Alves?' })

    await user.click(within(confirm).getByRole('button', { name: 'Gerar novo link' }))

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Aguarde 45 segundos para gerar um novo link deste convite.',
    )
    expect(tokens.i1).toBe('token-1')
    expect(calls('GET', LIST_URL)).toHaveLength(1)
  })

  it('given the invitation changed in another session, then it reloads the list without a false success', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    invitations[0]!.version = 2

    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    await user.click(screen.getByRole('button', { name: 'Gerar novo link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este convite foi alterado em outra sessão. A lista foi atualizada; revise e tente novamente.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/Novo link gerado/)).not.toBeInTheDocument()
    await waitFor(() => expect(calls('GET', LIST_URL)).toHaveLength(2))
  })

  it('given the invitation was accepted meanwhile, then it is no longer regenerable', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    invitations[0]!.status = 'ACCEPTED'

    await user.click(within(dialog).getByRole('button', { name: 'Gerar novo link' }))
    await user.click(screen.getByRole('button', { name: 'Gerar novo link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este convite não está mais pendente. A lista foi atualizada.',
    )
    await waitFor(() => expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument())
  })
})

describe('Members — revogar convite', () => {
  it('given the confirmation, then it revokes with If-Match and removes the person from the list', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')

    await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
    const confirm = screen.getByRole('dialog', { name: 'Revogar convite de Bruno Alves?' })
    expect(confirm).toHaveTextContent('O link deixará de funcionar')
    await user.click(within(confirm).getByRole('button', { name: 'Revogar convite' }))

    expect(
      await screen.findByText('Convite de Bruno Alves revogado. O link não funciona mais.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument())
    expect(screen.getByText('· 3 pessoas')).toBeInTheDocument()
    const [[, init]] = calls('DELETE', INVITATION_URL) as [string, RequestInit][]
    expect(ifMatchOf(init)).toBe('"1"')
  })

  it('given Manter convite or closing the dialog, then nothing is revoked', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')

    await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
    await user.click(screen.getByRole('button', { name: 'Manter convite' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Gerenciar convite' })).getByRole('button', {
        name: 'Fechar',
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('DELETE', INVITATION_URL)).toHaveLength(0)
    expect(within(row('Bruno Alves')).getByText('Convite pendente')).toBeInTheDocument()
  })

  it('given a failure, when revoking, then it keeps the invitation and allows a new attempt', async () => {
    let failures = 1
    interceptor = (method, url) =>
      method === 'DELETE' && INVITATION_URL.test(url) && failures-- > 0
        ? apiError(500, 'INTERNAL_ERROR')
        : undefined
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
    const confirm = screen.getByRole('dialog', { name: 'Revogar convite de Bruno Alves?' })

    await user.click(within(confirm).getByRole('button', { name: 'Revogar convite' }))

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Não foi possível revogar o convite. Tente novamente.',
    )
    expect(within(row('Bruno Alves')).getByText('Convite pendente')).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Revogar convite' }))
    expect(await screen.findByText(/revogado/)).toBeInTheDocument()
  })

  it('given the invitation was accepted meanwhile, then it is not revoked and the list is reloaded', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    invitations[0]!.status = 'ACCEPTED'

    await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
    await user.click(screen.getByRole('button', { name: 'Revogar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este convite já foi aceito. A lista foi atualizada.',
    )
    expect(screen.queryByText(/revogado\./)).not.toBeInTheDocument()
    expect(invitations[0]!.status).toBe('ACCEPTED')
  })

  it('given the invitation was already revoked in another session, then the idempotent 204 refreshes the list', async () => {
    renderMembers()
    const { user, dialog } = await openInvitation('Bruno Alves')
    invitations[0]!.status = 'REVOKED'
    invitations[0]!.version = 2

    await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
    await user.click(screen.getByRole('button', { name: 'Revogar convite' }))

    expect(await screen.findByText(/Convite de Bruno Alves revogado/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Bruno Alves')).not.toBeInTheDocument())
    expect(calls('DELETE', INVITATION_URL)).toHaveLength(1)
  })
})
