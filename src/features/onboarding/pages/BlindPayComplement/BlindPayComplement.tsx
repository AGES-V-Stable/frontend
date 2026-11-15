import { useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { Stepper } from '@/shared/components/Stepper'

type UploadKind = 'selfie' | 'proof'
type Step = 0 | 1 | 2 | 3

const MAX_FILE_SIZE = 10 * 1024 * 1024
const PROOF_TYPES = [
  { value: 'electricity', label: 'Conta de energia' },
  { value: 'water', label: 'Conta de água' },
  { value: 'gas', label: 'Conta de gás' },
  { value: 'internet', label: 'Conta de internet' },
  { value: 'bank-statement', label: 'Extrato bancário' },
  { value: 'other', label: 'Outro comprovante' },
] as const

const STEPS = ['Documento e selfie', 'Endereço', 'Termos BlindPay', 'Revisão'] as const

export function validateBlindPayUpload(file: File, kind: UploadKind): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowedExtensions = kind === 'selfie' ? ['jpg', 'jpeg', 'png'] : ['pdf', 'jpg', 'jpeg', 'png']
  const allowedMimes =
    kind === 'selfie' ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg', 'image/png']

  if (!allowedExtensions.includes(extension) || (file.type !== '' && !allowedMimes.includes(file.type))) {
    return kind === 'selfie'
      ? 'Envie uma foto JPG ou PNG.'
      : 'Envie um comprovante PDF, JPG ou PNG.'
  }
  if (file.size === 0) return 'O arquivo selecionado está vazio.'
  if (file.size > MAX_FILE_SIZE) return 'O arquivo deve ter no máximo 10 MB.'
  return null
}

interface UploadFieldProps {
  id: string
  title: string
  description: string
  accept: string
  kind: UploadKind
  file: File | null
  error?: string
  onSelect: (file: File | null, kind: UploadKind) => void
}

function UploadField({
  id,
  title,
  description,
  accept,
  kind,
  file,
  error,
  onSelect,
}: UploadFieldProps) {
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    onSelect(event.dataTransfer.files.item(0), kind)
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    onSelect(event.target.files?.item(0) ?? null, kind)
    event.target.value = ''
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-sage-800">{title} *</p>
      <label
        htmlFor={id}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={
          'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-surface px-4 py-6 text-center transition-colors hover:border-primary ' +
          (error ? 'border-red-700' : 'border-sage-300')
        }
      >
        <span className="text-sm font-medium text-primary">
          {file ? 'Substituir arquivo' : 'Selecionar arquivo ou arrastar aqui'}
        </span>
        <span className="text-xs text-slate-600">{description}</span>
        {file && <span className="max-w-full break-all text-sm text-slate-900">{file.name}</span>}
      </label>
      <input
        id={id}
        className="sr-only"
        type="file"
        aria-label={kind === 'selfie' ? 'Selecionar selfie' : 'Selecionar comprovante de endereço'}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + '-error' : undefined}
        accept={accept}
        onChange={onChange}
      />
      {error && (
        <p id={id + '-error'} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Interface complementar BlindPay, sem envio para o backend nesta etapa.
 * Arquivos permanecem somente em memória; o aceite hospedado exige URL e
 * confirmação verificadas pelo servidor antes de qualquer submissão real.
 */
export function BlindPayComplement() {
  const [step, setStep] = useState<Step>(0)
  const [issuingCountry, setIssuingCountry] = useState('')
  const [selfie, setSelfie] = useState<File | null>(null)
  const [proofType, setProofType] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function selectFile(file: File | null, kind: UploadKind) {
    const key = kind === 'selfie' ? 'selfie' : 'proof'
    const message = file ? validateBlindPayUpload(file, kind) : 'Selecione um arquivo.'
    if (kind === 'selfie') setSelfie(message ? null : file)
    else setProof(message ? null : file)
    setErrors((previous) => ({ ...previous, [key]: message ?? '' }))
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0) {
      const nextErrors = {
        country: issuingCountry.trim() ? '' : 'Informe o país que emitiu o documento.',
        selfie: selfie ? '' : 'Envie uma selfie em JPG ou PNG.',
      }
      setErrors(nextErrors)
      if (nextErrors.country || nextErrors.selfie) return
      setStep(1)
      return
    }
    if (step === 1) {
      const nextErrors = {
        proofType: proofType ? '' : 'Selecione o tipo de comprovante.',
        proof: proof ? '' : 'Envie seu comprovante de endereço.',
      }
      setErrors(nextErrors)
      if (nextErrors.proofType || nextErrors.proof) return
      setStep(2)
      return
    }
    if (step === 2) {
      setErrors({})
      setStep(3)
    }
  }

  const selectedProofType = PROOF_TYPES.find((item) => item.value === proofType)?.label ?? ''

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-8 md:px-10">
        <header className="text-center">
          <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Complementação cadastral</h1>
          <p className="mt-2 text-sm text-slate-600">
            Informações adicionais para validação do cadastro na BlindPay.
          </p>
        </header>
        <Stepper steps={STEPS} activeStep={step} className="max-w-[1070px]" />
        <hr className="border-sage-300" />

        <form className="flex flex-col gap-7" onSubmit={next} noValidate>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {step === 0
                ? 'Documento de identificação e selfie'
                : step === 1
                  ? 'Comprovante de endereço'
                  : step === 2
                    ? 'Aceite dos termos BlindPay'
                    : 'Revisão das informações'}
            </h2>
            <span className="text-sm font-medium text-primary">Etapa {step + 1} de 4</span>
          </div>

          {step === 0 && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="issuing-country" className="block text-sm font-medium text-sage-800">
                  País de emissão do documento *
                </label>
                <input
                  id="issuing-country"
                  value={issuingCountry}
                  onChange={(event) => {
                    setIssuingCountry(event.target.value)
                    setErrors((previous) => ({ ...previous, country: '' }))
                  }}
                  type="text"
                  autoComplete="country-name"
                  maxLength={80}
                  placeholder="Ex.: Brasil"
                  aria-invalid={Boolean(errors.country)}
                  aria-describedby={errors.country ? 'country-error' : 'country-help'}
                  className="w-full rounded-lg border border-sage-500 bg-surface px-4 py-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <p id="country-help" className="text-xs text-slate-600">
                  Pode ser diferente do país de residência informado no cadastro.
                </p>
                {errors.country && (
                  <p role="alert" id="country-error" className="text-sm text-red-700">
                    {errors.country}
                  </p>
                )}
              </div>
              <UploadField
                id="blindpay-selfie"
                title="Foto selfie"
                description="Envie uma foto do rosto. JPG ou PNG, até 10 MB. O ID de liveness da Avenia não substitui este arquivo."
                accept=".jpg,.jpeg,.png"
                kind="selfie"
                file={selfie}
                error={errors.selfie}
                onSelect={selectFile}
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <label htmlFor="proof-type" className="block text-sm font-medium text-sage-800">
                  Tipo de comprovante de endereço *
                </label>
                <select
                  id="proof-type"
                  value={proofType}
                  onChange={(event) => {
                    setProofType(event.target.value)
                    setErrors((previous) => ({ ...previous, proofType: '' }))
                  }}
                  aria-invalid={Boolean(errors.proofType)}
                  aria-describedby={errors.proofType ? 'proof-type-error' : undefined}
                  className="w-full rounded-lg border border-sage-500 bg-surface px-4 py-3 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Selecione o documento</option>
                  {PROOF_TYPES.map((item) => (
                    <option value={item.value} key={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-600">
                  Os tipos apresentados são opções de interface. A correspondência com os códigos da API será definida na integração.
                </p>
                {errors.proofType && (
                  <p id="proof-type-error" role="alert" className="text-sm text-red-700">
                    {errors.proofType}
                  </p>
                )}
              </div>
              <UploadField
                id="blindpay-proof"
                title="Arquivo do comprovante"
                description="PDF, JPG ou PNG, até 10 MB."
                accept=".pdf,.jpg,.jpeg,.png"
                kind="proof"
                file={proof}
                error={errors.proof}
                onSelect={selectFile}
              />
            </div>
          )}

          {step === 2 && (
            <section className="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-sage-300 bg-surface p-6">
              <h3 className="text-base font-semibold text-slate-900">Aceite em ambiente hospedado</h3>
              <p className="text-sm leading-6 text-slate-600">
                O aceite dos termos da BlindPay é separado dos termos da V-Stable. A confirmação
                deve ocorrer no ambiente oficial do provedor e ser validada pelo backend.
              </p>
              <div role="status" className="rounded-lg border border-sage-300 bg-white p-4 text-sm text-slate-700">
                Integração pendente: ainda não há link de aceite nem confirmação retornados pelo backend.
              </div>
              <Button type="button" label="Abrir termos BlindPay (indisponível)" disabled />
              <p className="text-xs text-slate-600">
                Você pode visualizar a revisão, mas isso não representa aceitação dos termos.
              </p>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <p className="text-sm text-slate-600">
                Confira os dados selecionados. Nenhum documento foi enviado; os arquivos permanecem
                somente nesta sessão da página.
              </p>
              <dl className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-sage-300 bg-surface p-4">
                  <dt className="text-sm text-slate-600">País de emissão</dt>
                  <dd className="mt-2 break-words font-medium text-slate-900">{issuingCountry.trim()}</dd>
                </div>
                <div className="rounded-lg border border-sage-300 bg-surface p-4">
                  <dt className="text-sm text-slate-600">Selfie</dt>
                  <dd className="mt-2 break-all font-medium text-slate-900">{selfie?.name}</dd>
                </div>
                <div className="rounded-lg border border-sage-300 bg-surface p-4">
                  <dt className="text-sm text-slate-600">Tipo de comprovante</dt>
                  <dd className="mt-2 font-medium text-slate-900">{selectedProofType}</dd>
                </div>
                <div className="rounded-lg border border-sage-300 bg-surface p-4">
                  <dt className="text-sm text-slate-600">Comprovante de endereço</dt>
                  <dd className="mt-2 break-all font-medium text-slate-900">{proof?.name}</dd>
                </div>
              </dl>
              <div role="status" className="rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-700">
                Aceite BlindPay pendente. Submissão bloqueada até implementar os endpoints de upload
                e a confirmação oficial do aceite no servidor.
              </div>
            </section>
          )}

          <div className="flex flex-col justify-end gap-3 border-t border-sage-300 pt-6 sm:flex-row">
            <div className="w-full sm:w-44">
              <Button
                label="Voltar"
                variant="neutral"
                type="button"
                disabled={step === 0}
                onClick={() => {
                  setErrors({})
                  setStep((current) => (current - 1) as Step)
                }}
              />
            </div>
            {step < 3 ? (
              <div className="w-full sm:w-52">
                <Button
                  label={step === 2 ? 'Ver revisão' : 'Continuar'}
                  type="submit"
                />
              </div>
            ) : (
              <div className="w-full sm:w-64">
                <Button label="Enviar para BlindPay (indisponível)" type="button" disabled />
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
