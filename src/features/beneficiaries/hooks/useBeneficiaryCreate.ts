import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '@/shared/http/httpClient'
import { useSession } from '@/features/auth'
import { createBeneficiary } from '@/features/beneficiaries/api/beneficiary'
import type { BeneficiaryCreatePayload } from '@/features/beneficiaries/api/beneficiary'

type ReceivingMethod = 'conta_bancaria' | 'wallet_cripto'

interface FormData {
  tipoBeneficiario: string
  razaoSocial: string
  documentoFiscal: string
  pais: string
  endereco: string
  banco: string
  swiftBic: string
  ibanNumeroConta: string
  moedaRecebimento: string
  apelidoConta: string
  enderecoWallet: string
  redeBlockchain: string
  apelidoWallet: string
}

type Field = keyof FormData

const TIPOS_BENEFICIARIO = ['Pessoa jurídica']

const identificationFields: { name: Field; label: string; placeholder: string }[] = [
  {
    name: 'razaoSocial',
    label: 'Razão social / Nome completo',
    placeholder: 'Ex.: João da Silva Comércio Ltda.',
  },
  { name: 'documentoFiscal', label: 'Documento fiscal', placeholder: 'CPF ou CNPJ' },
  { name: 'pais', label: 'País', placeholder: 'Brasil' },
  { name: 'endereco', label: 'Endereço', placeholder: 'Rua, número, cidade' },
]

const initialData: FormData = {
  tipoBeneficiario: TIPOS_BENEFICIARIO[0]!,
  razaoSocial: '',
  documentoFiscal: '',
  pais: '',
  endereco: '',
  banco: '',
  swiftBic: '',
  ibanNumeroConta: '',
  moedaRecebimento: '',
  apelidoConta: '',
  enderecoWallet: '',
  redeBlockchain: '',
  apelidoWallet: '',
}

const failureMessage = (error: unknown) =>
  error instanceof ApiError && error.status < 500
    ? error.message
    : 'Não foi possível concluir a solicitação. Tente novamente.'

function fieldsForMethod(method: ReceivingMethod): Field[] {
  return method === 'conta_bancaria'
    ? ['banco', 'swiftBic', 'ibanNumeroConta', 'moedaRecebimento', 'apelidoConta']
    : ['enderecoWallet', 'redeBlockchain', 'apelidoWallet']
}

export function useBeneficiaryCreate() {
  const [data, setData] = useState<FormData>(initialData)
  const [method, setMethod] = useState<ReceivingMethod>('conta_bancaria')
  const [confirmado, setConfirmado] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState(false)
  const companyId = useSession().user?.companyId
  const formRef = useRef<HTMLFormElement>(null)

  function change(name: Field, value: string) {
    setData((previous) => ({ ...previous, [name]: value }))
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  function resetForm() {
    setData(initialData)
    setMethod('conta_bancaria')
    setConfirmado(false)
    setErrors({})
    setConfirmError(undefined)
  }

  function handleCancel() {
    resetForm()
    setServerError(undefined)
    setSuccess(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const fieldsToValidate: Field[] = [
      'tipoBeneficiario',
      ...identificationFields.map((field) => field.name),
      ...fieldsForMethod(method),
    ]

    const nextErrors: Partial<Record<Field, string>> = {}
    fieldsToValidate.forEach((name) => {
      if (!data[name].trim()) nextErrors[name] = 'Campo obrigatório.'
    })
    setErrors(nextErrors)

    const confirmationInvalid = !confirmado
    setConfirmError(confirmationInvalid ? 'Confirme a revisão dos dados.' : undefined)

    const firstInvalidField = fieldsToValidate.find((name) => nextErrors[name])
    if (firstInvalidField) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)?.focus()
      return
    }
    if (confirmationInvalid) {
      formRef.current?.querySelector<HTMLInputElement>('[name="confirmacao"]')?.focus()
      return
    }
    if (!companyId) {
      setServerError(
        'Não foi possível identificar sua empresa. Recarregue a página e tente novamente.',
      )
      return
    }

    const base = {
      beneficiaryType: data.tipoBeneficiario,
      legalName: data.razaoSocial,
      identificationDocument: data.documentoFiscal,
      country: data.pais,
      address: data.endereco,
      confirmed: true,
    }
    const payload: BeneficiaryCreatePayload =
      method === 'conta_bancaria'
        ? {
            ...base,
            receivingMethod: 'BANK_ACCOUNT',
            bankName: data.banco,
            swiftBic: data.swiftBic,
            accountNumber: data.ibanNumeroConta,
            currency: data.moedaRecebimento,
            nickname: data.apelidoConta,
          }
        : {
            ...base,
            receivingMethod: 'CRYPTO_WALLET',
            walletAddress: data.enderecoWallet,
            blockchainNetwork: data.redeBlockchain.toLowerCase(),
            nickname: data.apelidoWallet,
          }

    setSaving(true)
    setServerError(undefined)
    setSuccess(false)
    createBeneficiary(companyId, payload)
      .then(() => {
        setSuccess(true)
        resetForm()
      })
      .catch((error: unknown) => setServerError(failureMessage(error)))
      .finally(() => setSaving(false))
  }

  return {
    data,
    method,
    setMethod,
    confirmado,
    setConfirmado,
    errors,
    confirmError,
    setConfirmError,
    saving,
    serverError,
    success,
    formRef,
    change,
    handleCancel,
    handleSubmit,
  }
}
