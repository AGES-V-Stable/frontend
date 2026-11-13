import { vi } from 'vitest'

/**
 * Contratos C-06/C-07 da issue frontend#108 / backend#74, simulados enquanto o backend não
 * está integrado. Valores fictícios; nenhum dado ou token real.
 */
export const INVITATION_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCdE'
export const INVITATION_LINK_HASH = `#token=${INVITATION_TOKEN}`
export const INVITATION_STORAGE_KEY = 'vstable:company-invitation'

export const resolvedInvitation = {
  invitationId: '44444444-4444-4444-8444-444444444444',
  company: { id: '22222222-2222-4222-8222-222222222222', name: 'Cooperativa AgroSul' },
  invitedBy: { name: 'João Rangel' },
  recipient: { name: 'Mariana Costa', email: 'mariana@agrosul.com.br' },
  role: 'OPERATOR',
  acceptanceMode: 'REGISTER',
  terms: { version: 'v1', termsUrl: '/termos-de-uso', privacyUrl: '/privacidade' },
} as const

export const existingUserInvitation = { ...resolvedInvitation, acceptanceMode: 'LOGIN' } as const

export const acceptedMember = {
  id: '33333333-3333-4333-8333-333333333333',
  userId: '11111111-1111-4111-8111-111111111111',
  companyId: resolvedInvitation.company.id,
  name: 'Mariana Costa',
  email: 'mariana@agrosul.com.br',
  role: 'OPERATOR',
  status: 'ACTIVE',
  version: 1,
  joinedAt: '2026-11-12T12:00:00Z',
  removedAt: null,
} as const

export const newUserAcceptance = {
  userId: acceptedMember.userId,
  membership: acceptedMember,
  nextAction: 'LOGIN',
} as const

const jwt = (claims: Record<string, unknown>) => `header.${btoa(JSON.stringify(claims))}.signature`
export const userJwt = jwt({ account_type: 'USER', sub: acceptedMember.userId })
export const adminJwt = jwt({ account_type: 'ADMIN', sub: 'admin-1' })

/** `/v1/users/me` antes do aceite (sem empresa) e depois dele (vínculo ativo). */
export const userWithoutCompany = {
  id: acceptedMember.userId,
  name: 'Mariana Costa',
  email: 'mariana@agrosul.com.br',
  companyId: null,
  accountType: 'USER',
  roles: ['ROLE_USER'],
  twoFactorEnabled: true,
  companyAccess: null,
}
export const userWithMembership = {
  ...userWithoutCompany,
  companyId: resolvedInvitation.company.id,
  companyAccess: {
    membershipId: acceptedMember.id,
    companyId: resolvedInvitation.company.id,
    role: 'OPERATOR',
    status: 'ACTIVE',
    permissions: ['COMPANY_READ', 'BALANCE_READ', 'SELF_MEMBERSHIP_READ'],
    version: 1,
  },
}
export const companyProfile = {
  id: resolvedInvitation.company.id,
  legalName: 'Cooperativa AgroSul Ltda.',
  tradeName: 'Cooperativa AgroSul',
  cnpj: '11222333000181',
}

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

/** Erro no formato do contrato: `{ code, message, details?, fieldErrors? }`. */
export const apiError = (
  status: number,
  code: string,
  message = 'Falha simulada.',
  init: ResponseInit = {},
  extra: Record<string, unknown> = {},
) => json({ code, message, ...extra }, { ...init, status })

type Handler = Response | ((init: RequestInit) => Response | Promise<Response>)

/**
 * Substitui `fetch` por rotas `MÉTODO /caminho`. Cada rota aceita uma resposta fixa (clonada a
 * cada chamada) ou uma função; uma lista de handlers é consumida em ordem, repetindo o último.
 */
export function stubApi(routes: Record<string, Handler | Handler[]>) {
  const calls = new Map<string, number>()
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${url}`
    const route = routes[key]
    if (!route) throw new Error(`Requisição inesperada: ${key}`)
    const count = calls.get(key) ?? 0
    calls.set(key, count + 1)
    const handler = Array.isArray(route) ? route[Math.min(count, route.length - 1)] : route
    return typeof handler === 'function' ? handler(init) : handler.clone()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Chamadas feitas a uma rota, com o body JSON e os headers enviados. */
export function requestsTo(fetchMock: ReturnType<typeof stubApi>, key: string) {
  return fetchMock.mock.calls
    .filter(([url, init]) => `${init?.method ?? 'GET'} ${url}` === key)
    .map(([, init]) => ({
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    }))
}
