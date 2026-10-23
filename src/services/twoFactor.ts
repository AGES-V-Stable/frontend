export {
  twoFactorService,
  reconfigure2fa,
  setup2fa,
  activate2fa,
  request2faRecovery,
  get2faResetRequests,
  approve2faReset,
  reject2faReset,
} from '@/features/auth/api/twoFactor'
export type {
  TwoFactorSetupResponse,
  TwoFactorActivateResponse,
  RecoveryRequestData,
  TwoFactorResetRequest,
} from '@/features/auth/api/twoFactor'
