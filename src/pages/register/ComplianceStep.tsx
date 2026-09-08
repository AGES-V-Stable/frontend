import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/Button/Button'
import type { ComplianceFormData, SelectedFile, TipoDocumento } from '@/types/compliance'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'CONTRATO_SOCIAL', label: 'Contrato Social' },
  { value: 'COMPROVANTE_ENDERECO', label: 'Comprovante de Endereço' },
  { value: 'DOCUMENTO_REPRESENTANTE', label: 'Documento do Representante' },
  { value: 'OUTROS', label: 'Outros' },
]

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ValidationErrors {
  tipoDocumento?: string
  nomeRepresentante?: string
  cargo?: string
  cpfRepresentante?: string
  documentos?: string
}

function validate(data: ComplianceFormData): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!data.tipoDocumento) errors.tipoDocumento = 'Selecione o tipo de documento'
  if (!data.nomeRepresentante.trim()) errors.nomeRepresentante = 'Nome do representante é obrigatório'
  if (!data.cargo.trim()) errors.cargo = 'Cargo é obrigatório'
  const cpfDigits = data.cpfRepresentante.replace(/\D/g, '')
  if (!cpfDigits) errors.cpfRepresentante = 'CPF é obrigatório'
  else if (cpfDigits.length !== 11) errors.cpfRepresentante = 'CPF deve conter 11 dígitos'
  if (data.documentos.length === 0) errors.documentos = 'Envie pelo menos um documento'
  return errors
}

export default function ComplianceStep() {
  const [form, setForm] = useState<ComplianceFormData>({
    tipoDocumento: '',
    nomeRepresentante: '',
    cargo: '',
    cpfRepresentante: '',
    documentos: [],
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newErrors: string[] = []
      const toAdd: SelectedFile[] = []

      Array.from(files).forEach((file) => {
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
        const validType = ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)
        if (!validType) {
          newErrors.push(`"${file.name}": tipo não permitido. Use PDF, JPG ou PNG.`)
          return
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          newErrors.push(`"${file.name}": tamanho excede 10 MB.`)
          return
        }
        const isDuplicate = form.documentos.some(
          (d) => d.file.name === file.name && d.file.size === file.size,
        )
        if (isDuplicate) return
        toAdd.push({ id: crypto.randomUUID(), file })
      })

      setFileErrors(newErrors)
      if (toAdd.length > 0) {
        setForm((prev) => ({ ...prev, documentos: [...prev.documentos, ...toAdd] }))
      }
    },
    [form.documentos],
  )

  const removeFile = (id: string) => {
    setForm((prev) => ({ ...prev, documentos: prev.documentos.filter((d) => d.id !== id) }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length === 0) setSuccess(true)
  }

  const handleChange = <K extends keyof ComplianceFormData>(
    key: K,
    value: ComplianceFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (submitted) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-widest text-[#059669]">V-STABLE</span>
      </div>

      <div className="flex items-center mb-8" aria-label="Passo 3 de 3">
        {([1, 2, 3] as const).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step < 3
                  ? 'bg-[#059669] text-white'
                  : 'bg-[#059669] text-white ring-2 ring-[#059669] ring-offset-2'
              }`}
              aria-current={step === 3 ? 'step' : undefined}
            >
              {step < 3 ? '✓' : step}
            </div>
            {step < 3 && <div className="w-12 h-0.5 bg-[#059669] mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Compliance e documentos</h1>

        {success ? (
          <div role="alert" className="text-center py-8">
            <p className="text-[#059669] font-semibold text-lg">Formulário enviado com sucesso!</p>
            <p className="text-gray-500 mt-2 text-sm">
              Seus documentos foram recebidos para análise.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="tipoDocumento"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <select
                id="tipoDocumento"
                value={form.tipoDocumento}
                onChange={(e) =>
                  handleChange('tipoDocumento', e.target.value as TipoDocumento | '')
                }
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#059669] ${errors.tipoDocumento ? 'border-red-500' : 'border-gray-300'}`}
                aria-describedby={errors.tipoDocumento ? 'tipoDocumento-error' : undefined}
              >
                <option value="">Selecione...</option>
                {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.tipoDocumento && (
                <p id="tipoDocumento-error" className="text-red-500 text-xs mt-1">
                  {errors.tipoDocumento}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="nomeRepresentante"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do Representante Legal <span className="text-red-500">*</span>
              </label>
              <input
                id="nomeRepresentante"
                type="text"
                value={form.nomeRepresentante}
                onChange={(e) => handleChange('nomeRepresentante', e.target.value)}
                placeholder="Nome completo"
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#059669] ${errors.nomeRepresentante ? 'border-red-500' : 'border-gray-300'}`}
                aria-describedby={errors.nomeRepresentante ? 'nomeRepresentante-error' : undefined}
              />
              {errors.nomeRepresentante && (
                <p id="nomeRepresentante-error" className="text-red-500 text-xs mt-1">
                  {errors.nomeRepresentante}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                Cargo <span className="text-red-500">*</span>
              </label>
              <input
                id="cargo"
                type="text"
                value={form.cargo}
                onChange={(e) => handleChange('cargo', e.target.value)}
                placeholder="Ex.: Diretor, Sócio-Administrador"
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#059669] ${errors.cargo ? 'border-red-500' : 'border-gray-300'}`}
                aria-describedby={errors.cargo ? 'cargo-error' : undefined}
              />
              {errors.cargo && (
                <p id="cargo-error" className="text-red-500 text-xs mt-1">
                  {errors.cargo}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="cpfRepresentante"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                CPF do Representante <span className="text-red-500">*</span>
              </label>
              <input
                id="cpfRepresentante"
                type="text"
                value={form.cpfRepresentante}
                onChange={(e) => handleChange('cpfRepresentante', formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#059669] ${errors.cpfRepresentante ? 'border-red-500' : 'border-gray-300'}`}
                aria-describedby={errors.cpfRepresentante ? 'cpfRepresentante-error' : undefined}
              />
              {errors.cpfRepresentante && (
                <p id="cpfRepresentante-error" className="text-red-500 text-xs mt-1">
                  {errors.cpfRepresentante}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Documentos <span className="text-red-500">*</span>
              </p>
              <div
                role="button"
                tabIndex={0}
                aria-label="Área de upload de documentos"
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#059669] bg-green-50'
                    : errors.documentos
                      ? 'border-red-400'
                      : 'border-gray-300 hover:border-[#059669]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <p className="text-sm text-gray-600">
                  Arraste e solte arquivos aqui ou{' '}
                  <span className="text-[#059669] font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, JPG, JPEG ou PNG — máx. 10 MB por arquivo
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileInput}
                aria-label="Selecionar arquivos"
                data-testid="file-input"
              />
              {errors.documentos && (
                <p className="text-red-500 text-xs mt-1">{errors.documentos}</p>
              )}
              {fileErrors.length > 0 && (
                <ul className="mt-2" aria-label="Erros de arquivo">
                  {fileErrors.map((err, i) => (
                    <li key={i} className="text-red-500 text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {form.documentos.length > 0 && (
              <ul className="mb-6 space-y-2" aria-label="Documentos selecionados">
                {form.documentos.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-800">{doc.file.name}</p>
                      <p className="text-gray-400 text-xs">{formatFileSize(doc.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(doc.id)}
                      className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Remover ${doc.file.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button type="submit" label="Continuar" />
          </form>
        )}
      </div>
    </div>
  )
}
