import { httpRequest, httpResponse } from '@/shared/http/httpClient'
import { MemberListResponseSchema, MemberSchema } from '../schemas/members'
import type { AssignableRole, Member, MemberListResponse } from '../schemas/members'

export const MEMBERS_PAGE_SIZE = 20

const membersPath = (companyId: string) => `/v1/companies/${encodeURIComponent(companyId)}/members`
const memberPath = (companyId: string, memberId: string) =>
  `${membersPath(companyId)}/${encodeURIComponent(memberId)}`

/** Versão do recurso no formato do backend: decimal entre aspas, como `"3"`. */
export const ifMatch = (version: number) => ({ 'If-Match': `"${version}"` })

/** Lê a versão de um ETag (`"3"` ou `W/"3"`); retorna null se o formato não for reconhecido. */
export function versionFromEtag(etag: string | null): number | null {
  const match = /^(?:W\/)?"(\d+)"$/.exec(etag?.trim() ?? '')
  return match ? Number(match[1]) : null
}

/** Membros ativos e convites pendentes da empresa (apenas o proprietário). `page` começa em 0. */
export async function getMembers(
  companyId: string,
  page = 0,
  signal?: AbortSignal,
): Promise<MemberListResponse> {
  const query = new URLSearchParams({ page: String(page), size: String(MEMBERS_PAGE_SIZE) })
  return MemberListResponseSchema.parse(
    await httpRequest<unknown>(`${membersPath(companyId)}?${query}`, { signal }),
  )
}

/** Vínculo do próprio usuário com a empresa, ativo ou removido; nunca expõe terceiros. */
export async function getOwnMembership(companyId: string, signal?: AbortSignal): Promise<Member> {
  return MemberSchema.parse(await httpRequest<unknown>(`${membersPath(companyId)}/me`, { signal }))
}

/** Altera o perfil de um membro ativo; a versão listada vai em If-Match. */
export async function updateMemberRole(
  companyId: string,
  member: Pick<Member, 'id' | 'version'>,
  role: AssignableRole,
): Promise<Member> {
  const response = await httpResponse(memberPath(companyId, member.id), {
    method: 'PATCH',
    headers: ifMatch(member.version),
    body: JSON.stringify({ role }),
  })
  const updated = MemberSchema.parse(await response.json())
  // O ETag é a fonte da versão para a próxima alteração; o corpo traz o mesmo valor.
  return { ...updated, version: versionFromEtag(response.headers.get('ETag')) ?? updated.version }
}

/** Revoga o acesso empresarial do membro; a conta pessoal e o histórico são preservados. */
export async function removeMember(
  companyId: string,
  member: Pick<Member, 'id' | 'version'>,
): Promise<void> {
  await httpResponse(memberPath(companyId, member.id), {
    method: 'DELETE',
    headers: ifMatch(member.version),
  })
}
