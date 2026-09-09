import { useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { maskCEP, maskCNPJ } from '@/utils/masks'
import { isValidCNPJ } from '@/utils/validators'
import type { CompanyData } from '@/types/registration'

export type { CompanyData } from '@/types/registration'

interface CompanyStepProps {
  initialValues?: Partial<CompanyData>
  onCancel: () => void
  onContinue: (data: CompanyData) => void
  saving?: boolean
  serverError?: string
}

type Field = keyof CompanyData
const fields: { name: Field; label: string; placeholder: string; required: boolean }[] = [
  {
    name: 'razaoSocial',
    label: 'Razão Social',
    placeholder: 'Ex.: V-Stable Tecnologia Ltda.',
    required: true,
  },
  { name: 'pais', label: 'País', placeholder: 'Brasil', required: true },
  { name: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', required: true },
  { name: 'cep', label: 'CEP', placeholder: '00000-000', required: true },
  { name: 'cidade', label: 'Cidade', placeholder: 'Ex: São Paulo', required: false },
  { name: 'estado', label: 'Estado', placeholder: 'Ex: SP, RJ', required: true },
]
const steps = ['Representante', 'Empresa', 'Compliance', 'Conclusão']

const brazil = (pais: string) => pais.trim().toLowerCase() === 'brasil'
function validate(name: Field, value: string, pais: string) {
  if (name !== 'cidade' && !value.trim()) return 'Campo obrigatório.'
  const maxLength = { razaoSocial: 255, pais: 100, estado: 100, cidade: 255, cep: 20, cnpj: 18 }[
    name
  ]
  if (value.trim().length > maxLength) return `Use no máximo ${maxLength} caracteres.`
  if (name === 'razaoSocial' && value.trim().length < 3) return 'Use pelo menos 3 caracteres.'
  if (name === 'cnpj' && value.replace(/\D/g, '').length !== 14)
    return 'Informe um CNPJ com 14 dígitos.'
  if (name === 'cnpj' && !isValidCNPJ(value)) return 'CNPJ inválido.'
  if (name === 'cep' && brazil(pais) && !/^(\d{8}|\d{5}-\d{3})$/.test(value.trim()))
    return 'Informe um CEP com 8 dígitos.'
  return undefined
}

export function CompanyStep({
  initialValues,
  onCancel,
  onContinue,
  saving = false,
  serverError,
}: CompanyStepProps) {
  const [data, setData] = useState<CompanyData>(() => ({
    razaoSocial: '',
    pais: 'Brasil',
    cidade: '',
    estado: '',
    ...initialValues,
    cnpj: maskCNPJ(initialValues?.cnpj ?? ''),
    cep: brazil(initialValues?.pais ?? 'Brasil')
      ? maskCEP(initialValues?.cep ?? '')
      : (initialValues?.cep ?? ''),
  }))
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)

  function change(name: Field, value: string) {
    const formatted =
      name === 'cnpj'
        ? maskCNPJ(value)
        : name === 'cep' && brazil(data.pais)
          ? maskCEP(value)
          : value
    setData((previous) => ({ ...previous, [name]: formatted }))
    if (errors[name] || name === 'pais')
      setErrors((previous) => ({
        ...previous,
        [name]: validate(name, formatted, data.pais),
        ...(name === 'pais' ? { cep: validate('cep', data.cep, value) } : {}),
      }))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-8 md:px-8">
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (saving) return
          const nextErrors: Partial<Record<Field, string>> = {}
          fields.forEach(({ name }) => {
            const error = validate(name, data[name], data.pais)
            if (error) nextErrors[name] = error
          })
          setErrors(nextErrors)
          const firstInvalid = fields.find(({ name }) => nextErrors[name])
          if (firstInvalid) {
            formRef.current
              ?.querySelector<HTMLInputElement>(`[name="${firstInvalid.name}"]`)
              ?.focus()
            return
          }
          onContinue({ ...data })
        }}
        className="flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-[#BBCABF] bg-white px-4 py-[30px] md:px-10"
      >
        <header className="flex flex-col items-center text-center">
          <img
            src="/images/register/v-stable-logo.png"
            alt="V-Stable"
            className="h-[68px] w-full max-w-[350px] object-contain"
          />
          <h1 className="mt-2 flex min-h-10 items-center text-2xl font-bold text-[#0F172A]">
            Cadastro Institucional
          </h1>
          <p className="mt-1 flex min-h-7 items-center text-xs text-[#64748B]">
            Preencha os dados da empresa para iniciar o processo de cadastro.
          </p>
        </header>
        <ol
          aria-label="Etapas do cadastro"
          className="mx-auto grid w-full max-w-[1070px] grid-cols-4"
        >
          {steps.map((step, index) => (
            <li
              key={step}
              aria-current={index === 1 ? 'step' : undefined}
              className="relative flex flex-col items-center gap-1.5"
            >
              {index < 3 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-[17px] h-0.5 md:left-[calc(50%+31px)] md:right-[calc(-50%+31px)] ${index === 0 ? 'bg-[#059669]' : 'bg-[#BBCABF]'}`}
                />
              )}
              <span className="relative flex size-9 items-center justify-center">
                <img
                  alt=""
                  src={`/images/register/step-${index === 0 ? 'completed' : index === 1 ? 'active' : 'pending'}.svg`}
                  className="absolute inset-0 size-9"
                />
                <span
                  className={`relative text-sm font-medium ${index === 1 ? 'text-white' : index === 0 ? 'text-[#059669]' : 'text-[#64748B]'}`}
                >
                  {index + 1}
                </span>
              </span>
              <span
                className={`flex min-h-6 items-center text-[10px] sm:text-xs ${index < 2 ? 'text-[#059669]' : 'text-[#64748B]'}`}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
        <hr className="border-[#BBCABF]" />
        {serverError && (
          <p role="alert" className="text-red-700">
            {serverError}
          </p>
        )}
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0F172A]">Dados da empresa</h2>
          <span className="shrink-0 text-sm font-medium text-[#059669]">Etapa 2 de 4</span>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
          {fields.map(({ name, label, placeholder, required }) => (
            <div
              key={name}
              className="flex min-h-[102px] items-center [&_label]:mb-1 [&_label]:font-medium"
            >
              <Input
                id={`company-${name}`}
                name={name}
                label={`${label}${required ? ' *' : ''}`}
                placeholder={placeholder}
                required={required}
                disabled={saving}
                value={data[name]}
                onChange={(event) => change(name, event.target.value)}
                error={errors[name]}
                inputMode={
                  name === 'cnpj' || (name === 'cep' && brazil(data.pais)) ? 'numeric' : 'text'
                }
                className="h-[50px] text-sm! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
              />
            </div>
          ))}
        </div>
        <p className="flex min-h-7 items-center text-xs text-[#64748B]">
          * Campos obrigatórios. Os dados poderão ser revisados antes do envio para análise.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:justify-end md:gap-[70px]">
          <div className="md:w-[170px]">
            <Button
              type="button"
              variant="neutral"
              label="Cancelar"
              onClick={onCancel}
              disabled={saving}
              className="h-12 font-medium"
            />
          </div>
          <div className="md:w-[170px]">
            <Button
              type="submit"
              disabled={saving}
              label={saving ? 'Salvando...' : 'Continuar'}
              className="h-12 font-medium"
            />
          </div>
        </div>
      </form>
    </main>
  )
}
