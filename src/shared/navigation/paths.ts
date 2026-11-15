export const PATHS = {
  HOME: '/',
  DASHBOARD: '/app/dashboard',
  MOCK_TOP_UP: '/app/saldo/adicionar',
  ADMIN_DASHBOARD: '/admin/dashboard',
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_COMPANY: '/register/empresa',
  REGISTER_REPRESENTATIVE: '/register/representante',
  REGISTER_2FA: '/register/:kycVerificationId/2fa',
  REGISTER_COMPLIANCE: '/register/:kycVerificationId/compliance',
  COMPLIANCE_LIVENESS: '/register/:kycVerificationId/compliance/liveness',
  REGISTER_COMPLETE: '/register/:kycVerificationId/concluido',
  ADMIN_CLIENTS: '/admin/clientes-pme',
  REGISTER_STATUS: '/register/status',
  FORGOT_PASSWORD: '/esqueci-senha',
  ADMIN_TRANSFERS: '/admin/transferencias',
  ADMIN_BENEFICIARIES: '/admin/beneficiarios',
  ADMIN_SECURITY: '/admin/solicitacoes-seguranca',
  BENEFICIARIES: '/app/beneficiarios',
  BENEFICIARIES_NEW: '/app/beneficiarios/novo',
  TRANSFERS: '/app/transferencias/nova',
  TRANSFER_DETAILS: '/app/transferencias/:id',
  SETTINGS: '/app/configuracoes',
  MEMBERS: '/app/membros',
  /** Usuário autenticado sem empresa cadastra a própria empresa. */
  COMPANY_SETUP: '/app/empresa/cadastrar',
  /** Link público do convite; o token chega somente no fragmento (`#token=<token>`). */
  COMPANY_INVITATION: '/convites/empresa',
} as const

export type Path = (typeof PATHS)[keyof typeof PATHS]

export const twoFactorSetupPath = (id: string) => `/register/${encodeURIComponent(id)}/2fa`
export const compliancePath = (id: string) => `/register/${encodeURIComponent(id)}/compliance`
export const livenessPath = (id: string) =>
  `/register/${encodeURIComponent(id)}/compliance/liveness`
export const registrationCompletePath = (id: string) =>
  `/register/${encodeURIComponent(id)}/concluido`
export const transferDetailsPath = (id: string) => `/app/transferencias/${encodeURIComponent(id)}`
/** Histórico administrativo com o detalhe da transferência aberto. */
export const adminTransferDetailsPath = (id: string) =>
  `${PATHS.ADMIN_TRANSFERS}?${new URLSearchParams({ transferId: id }).toString()}`
