import { httpRequest } from '@/shared/http/httpClient'
import { GeneratedInvitationSchema } from '../schemas/members'
import type { GeneratedInvitation, Invitation, InvitationForm } from '../schemas/members'
import { ifMatch } from './members'

const invitationsPath = (companyId: string) =>
  `/v1/companies/${encodeURIComponent(companyId)}/invitations`
const invitationPath = (companyId: string, invitationId: string) =>
  `${invitationsPath(companyId)}/${encodeURIComponent(invitationId)}`

// O link é um segredo: a resposta nunca é reaproveitada de cache do navegador.
const noStore: RequestInit = { cache: 'no-store' }

const parseGenerated = (body: unknown): GeneratedInvitation => GeneratedInvitationSchema.parse(body)

/** Cria um convite pendente e devolve o link para compartilhar (apenas o proprietário). */
export async function createInvitation(
  companyId: string,
  form: InvitationForm,
): Promise<GeneratedInvitation> {
  const body = { name: form.name, email: form.email, role: form.role }
  return parseGenerated(
    await httpRequest<unknown>(invitationsPath(companyId), {
      ...noStore,
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )
}

/** Link vigente de um convite pendente; não gera token nem altera a versão. */
export async function getInvitationLink(
  companyId: string,
  invitationId: string,
): Promise<GeneratedInvitation> {
  return parseGenerated(
    await httpRequest<unknown>(`${invitationPath(companyId, invitationId)}/link`, noStore),
  )
}

/** Gera um novo link e invalida o anterior; a versão listada vai em If-Match. */
export async function regenerateInvitationLink(
  companyId: string,
  invitation: Pick<Invitation, 'id' | 'version'>,
): Promise<GeneratedInvitation> {
  return parseGenerated(
    await httpRequest<unknown>(`${invitationPath(companyId, invitation.id)}/regenerate`, {
      ...noStore,
      method: 'POST',
      headers: ifMatch(invitation.version),
    }),
  )
}

/** Revoga um convite pendente e invalida o link; repetir uma revogação já feita também é sucesso. */
export async function revokeInvitation(
  companyId: string,
  invitation: Pick<Invitation, 'id' | 'version'>,
): Promise<void> {
  await httpRequest<unknown>(invitationPath(companyId, invitation.id), {
    method: 'DELETE',
    headers: ifMatch(invitation.version),
  })
}
