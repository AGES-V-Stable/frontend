import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/shared/components/Button'
import { Stepper } from '@/shared/components/Stepper'
import { maskCEP, maskCPF, maskPhone } from '@/shared/utils/masks'
import {
  loadIndividualKycStatus,
  restartIndividualKyc,
  startIndividualKycTerms,
  submitIndividualKyc,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import { BlindPayRfiForm } from './BlindPayRfiForm'
import type {
  IndividualKycProfile,
  IndividualKycStatus,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import { UploadField } from './UploadField'
import { describeKycStatus, isKycPending, kycErrorMessage } from './kycStatus'
import {
  EMPTY_PERSONAL_DATA,
  toDigits,
  validateBlindPayUpload,
  validatePersonalData,
} from './validation'
import type { PersonalData, UploadKind } from './validation'

type Step = 0 | 1 | 2 | 3 | 4
type IdDocType = IndividualKycProfile['idDocType']
type FileKey = 'idFront' | 'idBack' | 'selfie' | 'proof'

const STEPS = [
  'Dados pessoais',
  'Documento e selfie',
  'Endereço',
  'Termos BlindPay',
  'Revisão',
] as const

const HEADINGS = [
  'Dados pessoais do titular',
  'Documento de identificação e selfie',
  'Comprovante de endereço',
  'Aceite dos termos BlindPay',
  'Revisão das informações',
] as const

const ID_DOC_TYPES: { value: IdDocType; label: string }[] = [
  { value: 'ID_CARD', label: 'RG / Carteira de identidade' },
  { value: 'DRIVERS', label: 'CNH' },
  { value: 'PASSPORT', label: 'Passaporte' },
]

/** Opções da interface mapeadas para `proof_of_address_doc_type` da BlindPay. */
const PROOF_TYPES = [
  { value: 'electricity', label: 'Conta de energia', code: 'UTILITY_BILL' },
  { value: 'water', label: 'Conta de água', code: 'UTILITY_BILL' },
  { value: 'gas', label: 'Conta de gás', code: 'UTILITY_BILL' },
  { value: 'internet', label: 'Conta de internet', code: 'UTILITY_BILL' },
  { value: 'bank-statement', label: 'Extrato bancário', code: 'BANK_STATEMENT' },
  { value: 'rental', label: 'Contrato de aluguel', code: 'RENTAL_AGREEMENT' },
  { value: 'tax', label: 'Documento tributário (ex.: IPTU)', code: 'TAX_DOCUMENT' },
  {
    value: 'government',
    label: 'Correspondência governamental',
    code: 'GOVERNMENT_CORRESPONDENCE',
  },
] as const

/** Fora dos EUA a BlindPay espera o nome completo da região, não a sigla. */
const STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

const FILE_KIND: Record<FileKey, UploadKind> = {
  idFront: 'idDocument',
  idBack: 'idDocument',
  selfie: 'selfie',
  proof: 'proof',
}

const fieldClasses =
  'w-full rounded-lg border border-sage-500 bg-surface px-4 py-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-primary'

interface FieldProps {
  id: string
  label: string
  error?: string
  help?: string
  children: (describedBy: string | undefined) => ReactNode
}

function Field({ id, label, error, help, children }: FieldProps) {
  const describedBy = error ? id + '-error' : help ? id + '-help' : undefined
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-sage-800">
        {label}
      </label>
      {children(describedBy)}
      {help && !error && (
        <p id={id + '-help'} className="text-xs text-slate-600">
          {help}
        </p>
      )}
      {error && (
        <p role="alert" id={id + '-error'} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-sage-300 bg-surface p-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-2 break-all font-medium text-slate-900">{value}</dd>
    </div>
  )
}

const TONE_CLASSES = {
  success: 'border-primary bg-emerald-50 text-primary',
  warning: 'border-amber-700 bg-amber-50 text-amber-700',
  danger: 'border-red-700 bg-red-50 text-red-700',
  neutral: 'border-sage-300 bg-surface text-slate-700',
} as const

interface Props {
  /** Nunca contata o backend nem a BlindPay. Usado apenas em rotas de prévia do Vite DEV. */
  previewOnly?: boolean
  /** Permite adiar o KYC sem perder o acesso à aplicação. */
  onPostpone?: () => void
}

/**
 * KYC Standard individual na BlindPay (residentes no Brasil).
 * Arquivos ficam apenas em memória até o envio; o aceite dos termos acontece na
 * página hospedada da BlindPay e só vale após o backend receber o webhook assinado.
 */
export function BlindPayComplement({ previewOnly = false, onPostpone }: Props) {
  const [step, setStep] = useState<Step>(0)
  const [personal, setPersonal] = useState<PersonalData>(EMPTY_PERSONAL_DATA)
  const [idDocType, setIdDocType] = useState<IdDocType>('ID_CARD')
  const [proofType, setProofType] = useState('')
  const [files, setFiles] = useState<Record<FileKey, File | null>>({
    idFront: null,
    idBack: null,
    selfie: null,
    proof: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<IndividualKycStatus | null>(null)
  const [loading, setLoading] = useState(!previewOnly)
  const [termsUrl, setTermsUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  // A BlindPay redireciona para esta rota com ?tos_id= após o aceite, em uma nova aba.
  const [returnedFromTerms] = useState(
    () => !previewOnly && new URLSearchParams(window.location.search).has('tos_id'),
  )

  useEffect(() => {
    if (previewOnly) return
    let current = true
    loadIndividualKycStatus()
      .then((value) => {
        if (current) setStatus(value)
      })
      .catch((error: unknown) => {
        if (current)
          setNotice(kycErrorMessage(error, 'Não foi possível consultar a situação do seu KYC.'))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [previewOnly])

  // Consulta periódica enquanto se espera o webhook de aceite ou o resultado da análise.
  useEffect(() => {
    if (previewOnly || !status) return
    const waitingTerms = step === 3 && termsUrl !== null && !status.termsAccepted
    if (!waitingTerms && !isKycPending(status)) return
    const timer = window.setInterval(
      () => {
        loadIndividualKycStatus()
          .then(setStatus)
          .catch(() => undefined)
      },
      waitingTerms ? 5000 : 15000,
    )
    return () => window.clearInterval(timer)
  }, [previewOnly, status, step, termsUrl])

  const termsAccepted = previewOnly || Boolean(status?.termsAccepted)
  const proofOption = PROOF_TYPES.find((item) => item.value === proofType)
  const needsBack = idDocType !== 'PASSPORT'

  function changePersonal(field: keyof PersonalData, value: string) {
    setPersonal((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: '' }))
  }

  function selectFile(key: FileKey, file: File | null) {
    const message = file ? validateBlindPayUpload(file, FILE_KIND[key]) : 'Selecione um arquivo.'
    setFiles((previous) => ({ ...previous, [key]: message ? null : file }))
    setErrors((previous) => ({ ...previous, [key]: message ?? '' }))
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let nextErrors: Record<string, string> = {}
    if (step === 0) {
      nextErrors = validatePersonalData(personal)
    } else if (step === 1) {
      if (!files.idFront)
        nextErrors.idFront =
          idDocType === 'PASSPORT'
            ? 'Envie a página de identificação do passaporte.'
            : 'Envie a frente do documento.'
      if (needsBack && !files.idBack) nextErrors.idBack = 'Envie o verso do documento.'
      if (!files.selfie) nextErrors.selfie = 'Envie uma selfie em JPG ou PNG.'
    } else if (step === 2) {
      if (!proofType) nextErrors.proofType = 'Selecione o tipo de comprovante.'
      if (!files.proof) nextErrors.proof = 'Envie seu comprovante de endereço.'
    } else if (step === 3 && !termsAccepted) {
      nextErrors.terms = 'Conclua o aceite na página da BlindPay antes de continuar.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0 && step < 4) setStep((step + 1) as Step)
  }

  async function refreshStatus() {
    if (previewOnly) return
    setBusy(true)
    setNotice('')
    try {
      setStatus(await loadIndividualKycStatus())
    } catch (error) {
      setNotice(kycErrorMessage(error, 'Não foi possível atualizar a situação. Tente novamente.'))
    } finally {
      setBusy(false)
    }
  }

  async function openTerms() {
    if (previewOnly) return
    setBusy(true)
    setNotice('')
    try {
      setTermsUrl(await startIndividualKycTerms())
    } catch (error) {
      setNotice(kycErrorMessage(error, 'Não foi possível gerar o link dos termos da BlindPay.'))
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (previewOnly || !confirmed || !termsAccepted || !proofOption) return
    if (!files.idFront || !files.selfie || !files.proof || (needsBack && !files.idBack)) return
    setBusy(true)
    setNotice('')
    try {
      const profile: IndividualKycProfile = {
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        dateOfBirth: personal.dateOfBirth,
        taxId: toDigits(personal.cpf),
        phoneNumber: '+55' + toDigits(personal.phone),
        addressLine1: personal.addressLine1.trim(),
        addressLine2: personal.addressLine2.trim() || null,
        city: personal.city.trim(),
        stateProvinceRegion: STATES[personal.state] ?? personal.state,
        postalCode: toDigits(personal.postalCode),
        country: 'BR',
        idDocCountry: 'BR',
        idDocType,
        proofOfAddressDocType: proofOption.code,
      }
      setStatus(
        await submitIndividualKyc(profile, {
          idFront: files.idFront,
          idBack: needsBack ? files.idBack : null,
          selfie: files.selfie,
          proofAddress: files.proof,
        }),
      )
    } catch (error) {
      // Sem reenvio automático: uma falha ambígua após os uploads exige conferência manual.
      setNotice(
        kycErrorMessage(
          error,
          'O envio não foi confirmado. Não reenvie agora: atualize a situação e, se necessário, procure o suporte.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  function renderPersonalStep() {
    const text = (
      field: keyof PersonalData,
      label: string,
      options: {
        type?: string
        mask?: (value: string) => string
        autoComplete?: string
        placeholder?: string
        inputMode?: 'numeric' | 'tel'
      } = {},
    ) => (
      <Field id={field} label={label} error={errors[field]}>
        {(describedBy) => (
          <input
            id={field}
            type={options.type ?? 'text'}
            value={personal[field]}
            inputMode={options.inputMode}
            placeholder={options.placeholder}
            autoComplete={options.autoComplete ?? 'off'}
            onChange={(event) =>
              changePersonal(
                field,
                options.mask ? options.mask(event.target.value) : event.target.value,
              )
            }
            aria-invalid={Boolean(errors[field])}
            aria-describedby={describedBy}
            className={fieldClasses}
          />
        )}
      </Field>
    )

    return (
      <div className="grid gap-6 md:grid-cols-2">
        {text('firstName', 'Nome *', { autoComplete: 'given-name' })}
        {text('lastName', 'Sobrenome *', { autoComplete: 'family-name' })}
        {text('dateOfBirth', 'Data de nascimento *', { type: 'date', autoComplete: 'bday' })}
        {text('cpf', 'CPF *', {
          mask: maskCPF,
          inputMode: 'numeric',
          placeholder: '000.000.000-00',
        })}
        {text('phone', 'Celular *', {
          mask: maskPhone,
          inputMode: 'tel',
          autoComplete: 'tel-national',
          placeholder: '(51) 99999-9999',
        })}
        {text('postalCode', 'CEP *', {
          mask: maskCEP,
          inputMode: 'numeric',
          autoComplete: 'postal-code',
          placeholder: '00000-000',
        })}
        {text('addressLine1', 'Endereço e número *', { autoComplete: 'address-line1' })}
        {text('addressLine2', 'Complemento (opcional)', { autoComplete: 'address-line2' })}
        {text('city', 'Cidade *', { autoComplete: 'address-level2' })}
        <Field id="state" label="Estado *" error={errors.state}>
          {(describedBy) => (
            <select
              id="state"
              value={personal.state}
              onChange={(event) => changePersonal('state', event.target.value)}
              aria-invalid={Boolean(errors.state)}
              aria-describedby={describedBy}
              className={fieldClasses}
            >
              <option value="">Selecione o estado</option>
              {Object.entries(STATES).map(([uf, name]) => (
                <option key={uf} value={uf}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <p className="rounded-lg border border-sage-300 bg-surface p-4 text-sm text-slate-700 md:col-span-2">
          País de residência: Brasil. Neste momento a verificação está disponível apenas para
          residentes no Brasil. O e-mail utilizado é o da sua conta V-Stable.
        </p>
      </div>
    )
  }

  function renderDocumentStep() {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Field id="id-doc-type" label="Tipo de documento *">
          {() => (
            <select
              id="id-doc-type"
              value={idDocType}
              onChange={(event) => {
                setIdDocType(event.target.value as IdDocType)
                setErrors({})
              }}
              className={fieldClasses}
            >
              {ID_DOC_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          id="issuing-country"
          label="País de emissão do documento"
          help="Para residentes no Brasil, a BlindPay exige documento emitido no Brasil."
        >
          {(describedBy) => (
            <input
              id="issuing-country"
              value="Brasil"
              readOnly
              aria-describedby={describedBy}
              className={fieldClasses + ' text-slate-600'}
            />
          )}
        </Field>
        <UploadField
          id="blindpay-id-front"
          title={
            idDocType === 'PASSPORT'
              ? 'Página de identificação do passaporte'
              : 'Frente do documento'
          }
          inputLabel="Selecionar frente do documento"
          description="JPG ou PNG, até 3 MB. O documento deve aparecer inteiro e legível."
          kind="idDocument"
          file={files.idFront}
          error={errors.idFront}
          onSelect={(file) => selectFile('idFront', file)}
        />
        {needsBack && (
          <UploadField
            id="blindpay-id-back"
            title="Verso do documento"
            inputLabel="Selecionar verso do documento"
            description="JPG ou PNG, até 3 MB."
            kind="idDocument"
            file={files.idBack}
            error={errors.idBack}
            onSelect={(file) => selectFile('idBack', file)}
          />
        )}
        <UploadField
          id="blindpay-selfie"
          title="Foto selfie"
          inputLabel="Selecionar selfie"
          description="Foto do rosto, de frente e com boa iluminação. JPG ou PNG, até 3 MB. O ID de liveness da Avenia não substitui este arquivo."
          kind="selfie"
          file={files.selfie}
          error={errors.selfie}
          onSelect={(file) => selectFile('selfie', file)}
        />
      </div>
    )
  }

  function renderAddressStep() {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Field
          id="proof-type"
          label="Tipo de comprovante de endereço *"
          error={errors.proofType}
          help="Use um documento recente, em seu nome, com o mesmo endereço informado."
        >
          {(describedBy) => (
            <select
              id="proof-type"
              value={proofType}
              onChange={(event) => {
                setProofType(event.target.value)
                setErrors((previous) => ({ ...previous, proofType: '' }))
              }}
              aria-invalid={Boolean(errors.proofType)}
              aria-describedby={describedBy}
              className={fieldClasses}
            >
              <option value="">Selecione o documento</option>
              {PROOF_TYPES.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <UploadField
          id="blindpay-proof"
          title="Arquivo do comprovante"
          inputLabel="Selecionar comprovante de endereço"
          description="PDF, JPG ou PNG, até 3 MB."
          kind="proof"
          file={files.proof}
          error={errors.proof}
          onSelect={(file) => selectFile('proof', file)}
        />
      </div>
    )
  }

  function renderTermsStep() {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-sage-300 bg-surface p-6">
        <h3 className="text-base font-semibold text-slate-900">Aceite em ambiente hospedado</h3>
        <p className="text-sm leading-6 text-slate-600">
          O aceite dos termos da BlindPay é separado dos termos da V-Stable e acontece na página
          oficial do provedor, em uma nova aba. Depois de aceitar, volte para esta aba: a
          confirmação aparece aqui automaticamente.
        </p>
        {previewOnly ? (
          <>
            <div
              role="status"
              className="rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-700"
            >
              Prévia: o aceite não é iniciado nesta tela.
            </div>
            <Button type="button" label="Abrir termos BlindPay (indisponível na prévia)" disabled />
          </>
        ) : status?.termsAccepted ? (
          <div
            role="status"
            className="rounded-lg border border-primary bg-emerald-50 p-4 text-sm text-primary"
          >
            Aceite confirmado pela BlindPay.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                label={termsUrl ? 'Gerar novo link' : 'Gerar link dos termos'}
                variant={termsUrl ? 'neutral' : 'primary'}
                disabled={busy}
                onClick={() => void openTerms()}
              />
              <Button
                type="button"
                variant="secondary"
                label="Já aceitei, verificar"
                disabled={busy}
                onClick={() => void refreshStatus()}
              />
            </div>
            {termsUrl && (
              <>
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Abrir termos no site da BlindPay
                </a>
                <p role="status" className="text-xs text-slate-600">
                  Aguardando a confirmação da BlindPay...
                </p>
              </>
            )}
          </>
        )}
        {errors.terms && (
          <p role="alert" className="text-sm text-red-700">
            {errors.terms}
          </p>
        )}
      </section>
    )
  }

  function renderReviewStep() {
    const fileNames = [files.idFront, needsBack ? files.idBack : null, files.selfie, files.proof]
      .filter((file): file is File => file !== null)
      .map((file) => file.name)
    return (
      <section className="space-y-5">
        <p className="text-sm text-slate-600">
          Confira os dados antes de enviar. Os arquivos permanecem somente nesta página até a
          confirmação e não são salvos no navegador.
        </p>
        <dl className="grid gap-4 md:grid-cols-2">
          <ReviewItem label="Titular" value={`${personal.firstName} ${personal.lastName}`.trim()} />
          <ReviewItem label="CPF" value={personal.cpf} />
          <ReviewItem
            label="Endereço"
            value={`${personal.addressLine1}, ${personal.city} / ${personal.state} · ${personal.postalCode}`}
          />
          <ReviewItem
            label="Documento"
            value={`${ID_DOC_TYPES.find((item) => item.value === idDocType)?.label ?? ''} · Brasil`}
          />
          <ReviewItem label="Tipo de comprovante" value={proofOption?.label ?? ''} />
          <ReviewItem label="Arquivos" value={fileNames.join(', ')} />
        </dl>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 size-4 accent-emerald-700"
          />
          Confirmo que os dados são meus e que os documentos enviados são autênticos.
        </label>
      </section>
    )
  }

  /** A BlindPay não edita um cadastro recusado: o titular corrige os dados e envia outro. */
  async function restart() {
    if (previewOnly) return
    setBusy(true)
    setNotice('')
    try {
      setStatus(await restartIndividualKyc())
      setStep(0)
      setConfirmed(false)
      setTermsUrl(null)
    } catch (error) {
      setNotice(
        kycErrorMessage(error, 'Não foi possível iniciar um novo cadastro. Tente novamente.'),
      )
    } finally {
      setBusy(false)
    }
  }

  function renderStatus(current: IndividualKycStatus) {
    const view = describeKycStatus(current)
    const pending = isKycPending(current)
    const rfiOpen =
      current.kycStatus === 'compliance_request' || current.kycStatus === 'approved_rfi'
    return (
      <section className="mx-auto w-full max-w-xl space-y-5 py-8 text-center">
        <h2 className="text-xl font-bold text-slate-900">Situação da sua verificação</h2>
        <div role="status" className={'rounded-lg border p-5 ' + TONE_CLASSES[view.tone]}>
          <p className="font-semibold">{view.title}</p>
          <p className="mt-1 text-sm">{view.description}</p>
        </div>
        {pending && (
          <p className="text-xs text-slate-600">Esta página se atualiza automaticamente.</p>
        )}
        {rfiOpen && !previewOnly && <BlindPayRfiForm onSubmitted={setStatus} />}
        {current.kycStatus === 'rejected' && (
          <Button
            label={busy ? 'Iniciando...' : 'Corrigir dados e enviar novo cadastro'}
            disabled={busy || previewOnly}
            onClick={() => void restart()}
          />
        )}
        <Button
          label={busy ? 'Atualizando...' : 'Atualizar situação'}
          variant="secondary"
          disabled={busy}
          onClick={() => void refreshStatus()}
        />
      </section>
    )
  }

  let content: ReactNode
  if (loading) {
    content = (
      <p role="status" className="py-8 text-center text-sm text-slate-600">
        Carregando a situação da sua verificação...
      </p>
    )
  } else if (status?.submitted) {
    content = renderStatus(status)
  } else {
    content = (
      <>
        <Stepper steps={STEPS} activeStep={step} className="max-w-[1070px]" />
        <hr className="border-sage-300" />
        <form className="flex flex-col gap-7" onSubmit={next} noValidate>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{HEADINGS[step]}</h2>
            <span className="text-sm font-medium text-primary">
              Etapa {step + 1} de {STEPS.length}
            </span>
          </div>

          {step === 0 && renderPersonalStep()}
          {step === 1 && renderDocumentStep()}
          {step === 2 && renderAddressStep()}
          {step === 3 && renderTermsStep()}
          {step === 4 && renderReviewStep()}

          <div className="flex flex-col justify-end gap-3 border-t border-sage-300 pt-6 sm:flex-row">
            <div className="w-full sm:w-44">
              <Button
                label="Voltar"
                variant="neutral"
                type="button"
                disabled={step === 0 || busy}
                onClick={() => {
                  setErrors({})
                  setStep((current) => (current - 1) as Step)
                }}
              />
            </div>
            {step < 4 ? (
              <div className="w-full sm:w-52">
                <Button
                  label={step === 3 ? 'Ver revisão' : 'Continuar'}
                  type="submit"
                  disabled={busy}
                />
              </div>
            ) : (
              <div className="w-full sm:w-64">
                <Button
                  label={
                    previewOnly
                      ? 'Envio desativado na prévia'
                      : busy
                        ? 'Enviando...'
                        : 'Enviar para BlindPay'
                  }
                  type="button"
                  disabled={previewOnly || !confirmed || !termsAccepted || busy}
                  onClick={() => void submit()}
                />
              </div>
            )}
          </div>
        </form>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-8 md:px-10">
        <header className="text-center">
          <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Verificação de identidade</h1>
          <p className="mt-2 text-sm text-slate-600">
            Dados e documentos do titular para validação do cadastro na BlindPay.
          </p>
        </header>
        {onPostpone && !status?.submitted && (
          <section className="flex flex-col gap-3 rounded-lg border border-sage-300 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Prefere continuar depois?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Você pode acessar a plataforma agora e retomar esta verificação pelo Dashboard ou
                por Configurações.
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-48">
              <Button
                type="button"
                variant="secondary"
                label="Fazer mais tarde"
                onClick={onPostpone}
              />
            </div>
          </section>
        )}
        {previewOnly && (
          <p
            role="status"
            className="rounded-lg border border-amber-700 bg-amber-50 p-3 text-sm text-amber-700"
          >
            Prévia visual: nenhum dado, documento ou aceite será enviado à BlindPay.
          </p>
        )}
        {returnedFromTerms && (
          <p
            role="status"
            className="rounded-lg border border-primary bg-emerald-50 p-3 text-sm text-primary"
          >
            Termos aceitos na BlindPay. Você pode fechar esta aba e continuar na aba anterior.
          </p>
        )}
        {notice && (
          <p
            role="alert"
            className="rounded-lg border border-sage-300 bg-surface p-3 text-sm text-slate-700"
          >
            {notice}
          </p>
        )}
        {content}
      </div>
    </main>
  )
}
