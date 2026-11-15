import { HttpError } from '@/shared/http/httpClient'
import type { IndividualKycStatus } from '@/features/onboarding/api/blindpayIndividualKyc'

/** Estados em que a BlindPay ainda vai responder; a tela continua consultando. */
const PENDING = new Set([null, 'verifying', 'pending_review'])

export function isKycPending(status: IndividualKycStatus) {
  return status.submitted && PENDING.has(status.kycStatus)
}

export interface KycStatusView {
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  title: string
  description: string
}

/** Status de `kyc_status` conforme https://blindpay.com/docs/learn/customers. */
export function describeKycStatus(status: IndividualKycStatus): KycStatusView {
  switch (status.kycStatus) {
    case 'approved':
      return status.amlStatus === 'clear'
        ? {
            tone: 'success',
            title: 'Identidade aprovada',
            description: 'A BlindPay aprovou a verificação e a triagem AML foi liberada.',
          }
        : status.amlStatus === 'hit'
          ? {
              tone: 'warning',
              title: 'Identidade aprovada, com alerta AML',
              description:
                'A triagem AML apontou um alerta e está em análise de compliance na BlindPay.',
            }
          : {
              tone: 'warning',
              title: 'Identidade aprovada',
              description: 'A triagem AML da BlindPay ainda não foi concluída.',
            }
    case 'approved_rfi':
      return {
        tone: 'warning',
        title: 'Aprovado com pendência',
        description: 'A BlindPay aprovou o cadastro, mas solicitou informações adicionais.',
      }
    case 'compliance_request':
      return {
        tone: 'warning',
        title: 'Informações adicionais solicitadas',
        description:
          'A BlindPay pediu informações complementares. Entre em contato com o suporte V-Stable.',
      }
    case 'rejected':
      return {
        tone: 'danger',
        title: 'Verificação recusada',
        description:
          'A BlindPay recusou a verificação. Um novo cadastro precisa ser aberto pelo suporte.',
      }
    case 'pending_review':
      return {
        tone: 'neutral',
        title: 'Em revisão manual',
        description: 'A equipe de compliance da BlindPay está revisando os documentos.',
      }
    default:
      return {
        tone: 'neutral',
        title: 'Verificação em análise',
        description: 'A análise automática costuma levar cerca de um minuto.',
      }
  }
}

/** Traduz a resposta do backend sem expor detalhes internos ou do provedor. */
export function kycErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof HttpError)) return fallback
  switch (error.status) {
    case 0:
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
    case 503:
      return 'A verificação KYC não está habilitada neste ambiente.'
    case 409:
      return 'Já existe um envio ou aceite registrado para sua conta. Atualize a situação.'
    case 413:
      return 'Um dos arquivos excede o limite de 3 MB.'
    case 400:
    case 422:
      return 'Os dados ou documentos foram recusados. Revise CPF, documentos e o aceite dos termos.'
    default:
      return fallback
  }
}
