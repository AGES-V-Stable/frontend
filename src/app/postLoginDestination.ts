import { isStoredAdmin } from '@/features/auth'
import { getCurrentOnboarding } from '@/features/onboarding/api/onboarding'
import { pendingOnboardingPath } from '@/features/onboarding/model/registrationStatus'
import { PATHS } from '@/shared/navigation/paths'

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

/**
 * Destino após o login: o representante retoma o cadastro pendente; os demais voltam
 * à rota protegida de origem, quando ela pertence ao seu perfil, ou à página inicial do perfil.
 */
export async function postLoginDestination(from: string | null): Promise<string> {
  if (isStoredAdmin()) return from && isAdminPath(from) ? from : PATHS.ADMIN_CLIENTS
  // Sem verificação de KYC (404) ou com falha na consulta, o login segue normalmente.
  const onboarding = await getCurrentOnboarding().catch(() => null)
  const pending = onboarding ? pendingOnboardingPath(onboarding) : null
  if (pending) return pending
  return from && !isAdminPath(from) ? from : PATHS.HOME
}
