import { isStoredAdmin } from '@/features/auth'
import { getCurrentUser } from '@/features/auth/api/user'
import { getCurrentOnboarding } from '@/features/onboarding/api/onboarding'
import { pendingOnboardingPath } from '@/features/onboarding/model/registrationStatus'
import { PATHS } from '@/shared/navigation/paths'

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

/** Membro convidado (Operador/Visualizador) ativo não passa pelo cadastro individual de KYC. */
async function isActiveInvitedMember(): Promise<boolean> {
  const user = await getCurrentUser().catch(() => null)
  const access = user?.companyAccess
  return access?.status === 'ACTIVE' && access.role !== 'OWNER'
}

/**
 * Destino após o login: quem veio de um convite retorna a ele para confirmar o vínculo; o
 * representante retoma o cadastro pendente; os demais voltam à rota protegida de origem, quando
 * ela pertence ao seu perfil, ou à página inicial do perfil.
 */
export async function postLoginDestination(from: string | null): Promise<string> {
  if (from === PATHS.COMPANY_INVITATION) return from
  if (isStoredAdmin()) return from && isAdminPath(from) ? from : PATHS.ADMIN_CLIENTS
  const fallback = from && !isAdminPath(from) ? from : PATHS.HOME
  if (await isActiveInvitedMember()) return fallback
  // Sem verificação de KYC (404) ou com falha na consulta, o login segue normalmente.
  const onboarding = await getCurrentOnboarding().catch(() => null)
  const pending = onboarding ? pendingOnboardingPath(onboarding) : null
  return pending ?? fallback
}
