import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { Stepper } from '@/shared/components/Stepper'
import {
  loadIndividualKycStatus,
  startIndividualKycTerms,
  submitIndividualKyc,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import type {
  IndividualKycProfile,
  IndividualKycStatus,
} from '@/features/onboarding/api/blindpayIndividualKyc'

const STEPS = ['Dados pessoais', 'Documentos', 'Termos', 'Revisão']
const MAX_BYTES = 3 * 1024 * 1024

const INITIAL: IndividualKycProfile = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  taxId: '',
  phoneNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateProvinceRegion: '',
  postalCode: '',
  country: 'BR',
  idDocCountry: 'BR',
  idDocType: 'ID_CARD',
  proofOfAddressDocType: null,
}

type Attachment = 'idFront' | 'idBack' | 'selfie' | 'proofAddress'
type Step = 0 | 1 | 2 | 3

function validateAttachment(file: File, imageOnly: boolean): string | null {
  const extensions = imageOnly ? ['jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png', 'pdf']
  const types = imageOnly
    ? ['image/jpeg', 'image/png']
    : ['image/jpeg', 'image/png', 'application/pdf']
  const suffix = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!extensions.includes(suffix) || (file.type && !types.includes(file.type))) {
    return imageOnly ? 'Use uma imagem JPG ou PNG.' : 'Use um arquivo PDF, JPG ou PNG.'
  }
  if (!file.size) return 'O arquivo está vazio.'
  if (file.size > MAX_BYTES) return 'O arquivo deve ter até 3 MB.'
  return null
}

interface DocumentFieldProps {
  id: Attachment
  label: string
  optional?: boolean
  imageOnly?: boolean
  file: File | null
  error?: string
  onChange: (id: Attachment, file: File | null) => void
}

function DocumentField({
  id,
  label,
  optional = false,
  imageOnly = false,
  file,
  error,
  onChange,
}: DocumentFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-sage-800">
        {label} {optional ? '(opcional)' : '*'}
      </label>
      <input
        id={id}
        type="file"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + '-error' : undefined}
        accept={imageOnly ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
        className="block w-full rounded-lg border border-sage-300 bg-surface px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-primary"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(id, event.target.files?.item(0) ?? null)
          event.target.value = ''
        }}
      />
      <p className="text-xs text-slate-500">
        {imageOnly ? 'JPG ou PNG' : 'PDF, JPG ou PNG'} · máximo de 3 MB.
      </p>
      {file && <p className="break-all text-xs text-slate-700">Selecionado: {file.name}</p>}
      {error && (
        <p role="alert" id={id + '-error'} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

interface Props {
  /** Never contacts the provider. Used exclusively on a Vite DEV-only route. */
  previewOnly?: boolean
}

export function BlindPayIndividualKyc({ previewOnly = false }: Props) {
  const [step, setStep] = useState<Step>(0)
  const [profile, setProfile] = useState<IndividualKycProfile>(INITIAL)
  const [files, setFiles] = useState<Record<Attachment, File | null>>({
    idFront: null,
    idBack: null,
    selfie: null,
    proofAddress: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<IndividualKycStatus | null>(null)
  const [termsUrl, setTermsUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (previewOnly) return
    let current = true
    void loadIndividualKycStatus()
      .then((value) => { if (current) setStatus(value) })
      .catch(() => {
        if (current) setNotice('Não foi possível consultar o KYC. Verifique se a integração está habilitada.')
      })
    return () => { current = false }
  }, [previewOnly])

  function change<K extends keyof IndividualKycProfile>(key: K, value: IndividualKycProfile[K]) {
    setProfile((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
  }

  function changeFile(id: Attachment, file: File | null) {
    const imageOnly = id !== 'proofAddress'
    const issue = file ? validateAttachment(file, imageOnly) : ''
    setFiles((previous) => ({ ...previous, [id]: issue ? null : file }))
    setErrors((previous) => ({ ...previous, [id]: issue ?? '' }))
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0) {
      const required: (keyof IndividualKycProfile)[] = [
        'firstName', 'lastName', 'dateOfBirth', 'taxId', 'phoneNumber',
        'addressLine1', 'city', 'stateProvinceRegion', 'postalCode',
      ]
      const nextErrors: Record<string, string> = {}
      for (const name of required) {
        if (!String(profile[name] ?? '').trim()) nextErrors[name] = 'Campo obrigatório.'
      }
      if (!nextErrors.taxId && !/^\d{11}$/.test(profile.taxId))
        nextErrors.taxId = 'Informe os 11 dígitos do CPF.'
      if (!nextErrors.postalCode && !/^\d{8}$/.test(profile.postalCode))
        nextErrors.postalCode = 'Informe os 8 dígitos do CEP.'
      if (!nextErrors.phoneNumber && !/^\+55[1-9]\d{9,10}$/.test(profile.phoneNumber))
        nextErrors.phoneNumber = 'Informe o telefone no padrão +55DDDNUMERO.'
      if (!nextErrors.dateOfBirth && profile.dateOfBirth >= new Date().toISOString().slice(0, 10))
        nextErrors.dateOfBirth = 'Informe uma data de nascimento anterior a hoje.'
      setErrors(nextErrors)
      if (!Object.keys(nextErrors).length) setStep(1)
      return
    }
    if (step === 1) {
      const nextErrors: Record<string, string> = {}
      if (!files.idFront) nextErrors.idFront = 'Envie a frente do documento.'
      if (profile.idDocType !== 'PASSPORT' && !files.idBack)
        nextErrors.idBack = 'Envie também o verso do documento.'
      if (!files.selfie) nextErrors.selfie = 'Envie uma selfie.'
      if (Boolean(files.proofAddress) !== Boolean(profile.proofOfAddressDocType)) {
        nextErrors.proofAddress = 'Tipo e arquivo do comprovante devem ser preenchidos juntos.'
      }
      setErrors(nextErrors)
      if (!Object.keys(nextErrors).length) setStep(2)
      return
    }
    if (step === 2 && (previewOnly || status?.termsAccepted)) setStep(3)
  }

  async function checkStatus() {
    if (previewOnly) return
    setBusy(true)
    setNotice('')
    try {
      setStatus(await loadIndividualKycStatus())
    } catch {
      setNotice('Não foi possível atualizar o status. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function createTerms() {
    if (previewOnly) return
    setBusy(true)
    setNotice('')
    try {
      const url = await startIndividualKycTerms()
      setTermsUrl(url)
    } catch {
      setNotice('Não foi possível abrir os termos hospedados da BlindPay.')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (previewOnly || !confirmed || !status?.termsAccepted || !files.idFront || !files.selfie)
      return
    setBusy(true)
    setNotice('')
    try {
      setStatus(await submitIndividualKyc(profile, {
        idFront: files.idFront,
        idBack: files.idBack,
        selfie: files.selfie,
        proofAddress: files.proofAddress,
      }))
      setNotice('KYC enviado para análise. A aprovação depende do retorno da BlindPay.')
    } catch {
      setNotice('O envio não foi confirmado. Não tente reenviar automaticamente; consulte o status e procure o suporte se necessário.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClasses =
    'w-full rounded-lg border border-sage-500 bg-surface px-3 py-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-primary'
  const statusText = status?.kycStatus === 'approved'
    ? status.amlStatus === 'clear'
      ? 'Identidade aprovada e triagem AML liberada pela BlindPay'
      : 'Identidade aprovada; a triagem AML ainda não está liberada'
    : status?.kycStatus === 'rejected'
      ? 'KYC rejeitado; contate o suporte para novo cadastro'
      : status?.kycStatus === 'compliance_request'
        ? 'Informações adicionais solicitadas pela BlindPay'
        : status?.kycStatus === 'approved_rfi'
          ? 'Aprovado com solicitação de informações pendente'
          : 'Verificação em análise'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-6 rounded-xl border border-sage-300 bg-white px-4 py-8 md:px-10">
        <header className="text-center">
          <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Verificação KYC · BlindPay</h1>
          <p className="mt-2 text-sm text-slate-600">
            Validação individual do titular. Independente do KYB empresarial e da verificação Avenia.
          </p>
        </header>
        {previewOnly && (
          <p role="status" className="rounded-lg border border-amber-700 bg-amber-50 p-3 text-sm text-amber-700">
            Prévia visual: nenhum dado, documento ou aceite será enviado à BlindPay.
          </p>
        )}
        {notice && <p role="alert" className="rounded-lg border border-sage-300 bg-surface p-3 text-sm text-slate-700">{notice}</p>}
        {status?.submitted ? (
          <section className="mx-auto w-full max-w-xl space-y-4 py-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">Situação do seu KYC</h2>
            <p role="status" className="rounded-lg border border-sage-300 bg-surface p-5">{statusText}</p>
            <Button label={busy ? 'Atualizando...' : 'Atualizar situação'} disabled={busy} onClick={() => void checkStatus()} />
          </section>
        ) : (
          <>
            <Stepper steps={STEPS} activeStep={step} className="max-w-[1070px]" />
            <hr className="border-sage-300" />
            <form onSubmit={next} noValidate className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {['Dados pessoais e endereço', 'Documentos e selfie', 'Aceite dos termos BlindPay', 'Revisão e envio'][step]}
                </h2>
                <span className="text-sm font-medium text-primary">Etapa {step + 1} de 4</span>
              </div>

              {step === 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  {([
                    ['firstName', 'Primeiro nome', 'text'],
                    ['lastName', 'Sobrenome', 'text'],
                    ['dateOfBirth', 'Data de nascimento', 'date'],
                    ['taxId', 'CPF (somente números)', 'text'],
                    ['phoneNumber', 'Telefone (+55...)', 'tel'],
                    ['addressLine1', 'Endereço e número', 'text'],
                    ['addressLine2', 'Complemento (opcional)', 'text'],
                    ['city', 'Cidade', 'text'],
                    ['stateProvinceRegion', 'Estado (UF)', 'text'],
                    ['postalCode', 'CEP (somente números)', 'text'],
                  ] as const).map(([key, label, type]) => (
                    <div key={key} className="space-y-2">
                      <label htmlFor={key} className="block text-sm font-medium text-sage-800">{label}</label>
                      <input
                        id={key}
                        type={type}
                        className={fieldClasses}
                        value={profile[key]}
                        onChange={(event) => change(key, event.target.value)}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? key + '-error' : undefined}
                        autoComplete="off"
                      />
                      {errors[key] && <p role="alert" id={key + '-error'} className="text-sm text-red-700">{errors[key]}</p>}
                    </div>
                  ))}
                  <div className="rounded-lg border border-sage-300 bg-surface p-4 text-sm text-slate-700 md:col-span-2">
                    País de residência: Brasil (BR). Neste primeiro fluxo, o KYC Standard está disponível apenas para residentes no Brasil.
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="idDocType" className="text-sm font-medium text-sage-800">Tipo de documento *</label>
                    <select id="idDocType" value={profile.idDocType} onChange={(event) => change('idDocType', event.target.value as IndividualKycProfile['idDocType'])} className={fieldClasses}>
                      <option value="ID_CARD">RG</option>
                      <option value="DRIVERS">CNH</option>
                      <option value="PASSPORT">Passaporte</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-sage-300 bg-surface p-4 text-sm text-slate-700">
                    País de emissão do documento: Brasil (BR). Exigência específica para KYC de residentes brasileiros.
                  </div>
                  <DocumentField id="idFront" label={profile.idDocType === 'PASSPORT' ? 'Passaporte' : 'Frente do documento'} file={files.idFront} imageOnly error={errors.idFront} onChange={changeFile} />
                  {profile.idDocType !== 'PASSPORT' && (
                    <DocumentField id="idBack" label="Verso do documento" file={files.idBack} imageOnly error={errors.idBack} onChange={changeFile} />
                  )}
                  <DocumentField id="selfie" label="Selfie do rosto" file={files.selfie} imageOnly error={errors.selfie} onChange={changeFile} />
                  <div className="space-y-2">
                    <label htmlFor="proofOfAddressDocType" className="block text-sm font-medium text-sage-800">Tipo de comprovante de endereço (opcional no Standard)</label>
                    <select id="proofOfAddressDocType" className={fieldClasses} value={profile.proofOfAddressDocType ?? ''} onChange={(event) => change('proofOfAddressDocType', event.target.value || null)}>
                      <option value="">Não enviar comprovante</option>
                      <option value="UTILITY_BILL">Conta de serviços (água, luz, gás)</option>
                      <option value="BANK_STATEMENT">Extrato bancário</option>
                      <option value="RENTAL_AGREEMENT">Contrato de aluguel</option>
                      <option value="TAX_DOCUMENT">Documento tributário</option>
                      <option value="GOVERNMENT_CORRESPONDENCE">Correspondência governamental</option>
                    </select>
                  </div>
                  <DocumentField id="proofAddress" label="Arquivo do comprovante de endereço" optional file={files.proofAddress} error={errors.proofAddress} onChange={changeFile} />
                </div>
              )}

              {step === 2 && (
                <section className="mx-auto w-full max-w-2xl space-y-4 rounded-lg border border-sage-300 bg-surface p-6">
                  <p className="text-sm leading-6 text-slate-700">
                    A aceitação dos termos ocorre na página oficial da BlindPay e deve ser confirmada pelo servidor. Não basta marcar uma caixa nesta tela.
                  </p>
                  {status?.termsAccepted ? (
                    <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-primary">Aceite confirmado pela BlindPay.</p>
                  ) : (
                    <>
                      <Button type="button" label={previewOnly ? 'Iniciar aceite (desativado na prévia)' : 'Gerar link de aceite BlindPay'} disabled={previewOnly || busy} onClick={() => void createTerms()} />
                      {termsUrl && <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium text-primary underline">Abrir termos no site da BlindPay</a>}
                      <Button type="button" variant="secondary" label="Verificar aceite" disabled={previewOnly || busy} onClick={() => void checkStatus()} />
                    </>
                  )}
                  {previewOnly && <p className="text-xs text-slate-500">Você poderá avançar apenas para conferir a revisão visual.</p>}
                </section>
              )}

              {step === 3 && (
                <section className="mx-auto w-full max-w-3xl space-y-5">
                  <dl className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-sage-300 bg-surface p-4"><dt className="text-xs text-slate-600">Titular</dt><dd className="mt-2 text-sm font-medium text-slate-900">{profile.firstName} {profile.lastName}</dd></div>
                    <div className="rounded-lg border border-sage-300 bg-surface p-4"><dt className="text-xs text-slate-600">Residência</dt><dd className="mt-2 text-sm font-medium text-slate-900">{profile.city} / {profile.stateProvinceRegion} · Brasil</dd></div>
                    <div className="rounded-lg border border-sage-300 bg-surface p-4"><dt className="text-xs text-slate-600">Documento</dt><dd className="mt-2 text-sm font-medium text-slate-900">{profile.idDocType} · BR</dd></div>
                    <div className="rounded-lg border border-sage-300 bg-surface p-4"><dt className="text-xs text-slate-600">Arquivos</dt><dd className="mt-2 text-sm font-medium text-slate-900">{[files.idFront, files.idBack, files.selfie, files.proofAddress].filter(Boolean).length} selecionados</dd></div>
                  </dl>
                  <p className="text-sm text-slate-600">
                    Os documentos serão enviados apenas ao confirmar; nenhum arquivo foi salvo no navegador.
                  </p>
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-emerald-700" />
                    Confirmo que os dados são meus e que os documentos enviados são autênticos.
                  </label>
                  <Button
                    type="button"
                    label={previewOnly ? 'Envio desativado na prévia' : busy ? 'Enviando...' : 'Enviar KYC à BlindPay'}
                    disabled={previewOnly || !confirmed || !status?.termsAccepted || busy}
                    onClick={() => void submit()}
                  />
                </section>
              )}

              <footer className="flex flex-wrap justify-end gap-3 border-t border-sage-300 pt-5">
                <div className="w-36"><Button label="Voltar" variant="neutral" type="button" disabled={step === 0 || busy} onClick={() => { setErrors({}); setStep((value) => (value - 1) as Step) }} /></div>
                {step < 3 && (
                  <div className="w-44">
                    <Button type="submit" label="Continuar" disabled={busy || (step === 2 && !previewOnly && !status?.termsAccepted)} />
                  </div>
                )}
              </footer>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
