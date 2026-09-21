import { useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { RepresentativeAccessSchema } from '@/schemas/onboarding'
import type { RepresentativeData } from '@/types/onboarding'
import { maskCEP, maskCPF, maskPhone } from '@/utils/masks'
import { isValidCPF } from '@/utils/validators'
import { RegistrationSteps } from './RegistrationSteps'

const CARGOS = [
  'Sócio-administrador',
  'Diretor(a)',
  'Administrador(a)',
  'Procurador(a)',
  'Representante legal',
]

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

type Errors = Partial<Record<keyof RepresentativeData, string>>

function validatePersonal(data: RepresentativeData): Errors {
  const errors: Errors = {}
  if (!data.cargoFuncao) errors.cargoFuncao = 'Cargo é obrigatório'
  if (!data.cpf) errors.cpf = 'CPF é obrigatório'
  else if (!isValidCPF(data.cpf)) errors.cpf = 'CPF inválido'
  if (!data.dateOfBirth) errors.dateOfBirth = 'Data de nascimento é obrigatória'
  if (!data.phone) errors.phone = 'Telefone é obrigatório'
  else if (data.phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone inválido'
  if (!data.cep) errors.cep = 'CEP é obrigatório'
  else if (data.cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido'
  if (!data.cidade) errors.cidade = 'Cidade é obrigatória'
  if (!data.estado) errors.estado = 'Estado é obrigatório'
  if (!data.pais) errors.pais = 'País é obrigatório'
  if (!data.linhaEndereco) errors.linhaEndereco = 'Endereço é obrigatório'
  return errors
}

function validateAccess(data: RepresentativeData): Errors {
  const result = RepresentativeAccessSchema.safeParse(data)
  if (result.success) return {}

  const errors: Errors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RepresentativeData
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

export interface RepresentativeStepProps {
  initialValues?: Partial<RepresentativeData>
  onBack: () => void
  onContinue: (data: RepresentativeData) => void
}

export function RepresentativeStep({ initialValues, onBack, onContinue }: RepresentativeStepProps) {
  const [data, setData] = useState<RepresentativeData>(() => ({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cargoFuncao: '',
    participacaoSocietaria: 0,
    cpf: '',
    dateOfBirth: '',
    phone: '',
    pais: 'Brasil',
    cep: '',
    cidade: '',
    estado: '',
    linhaEndereco: '',
    ...initialValues,
  }))
  const [errors, setErrors] = useState<Errors>({})

  function change<K extends keyof RepresentativeData>(field: K, value: RepresentativeData[K]) {
    let formatted = value
    if (field === 'cpf') formatted = maskCPF(value as string) as RepresentativeData[K]
    if (field === 'cep') formatted = maskCEP(value as string) as RepresentativeData[K]
    if (field === 'phone') formatted = maskPhone(value as string) as RepresentativeData[K]

    setData((previous) => ({ ...previous, [field]: formatted }))
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  function handleBlurCPF() {
    if (data.cpf && !isValidCPF(data.cpf)) {
      setErrors((previous) => ({ ...previous, cpf: 'CPF inválido' }))
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = { ...validateAccess(data), ...validatePersonal(data) }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onContinue(data)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-8 md:px-8">
      <form
        noValidate
        onSubmit={handleSubmit}
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
            Crie seu acesso e informe seus dados de representante para iniciar o cadastro.
          </p>
        </header>

        <RegistrationSteps currentIndex={0} />
        <hr className="border-[#BBCABF]" />

        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0F172A]">Dados de acesso e do representante</h2>
          <span className="shrink-0 text-sm font-medium text-[#059669]">Etapa 1 de 4</span>
        </div>

        <section>
          <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-700">Acesso</h3>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            <Input
              id="fullName"
              label="Nome completo *"
              value={data.fullName}
              onChange={(event) => change('fullName', event.target.value)}
              error={errors.fullName}
            />
            <Input
              id="email"
              type="email"
              label="E-mail *"
              value={data.email}
              onChange={(event) => change('email', event.target.value)}
              error={errors.email}
            />
            <Input
              id="password"
              type="password"
              label="Senha *"
              value={data.password}
              onChange={(event) => change('password', event.target.value)}
              error={errors.password}
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirmar senha *"
              value={data.confirmPassword}
              onChange={(event) => change('confirmPassword', event.target.value)}
              error={errors.confirmPassword}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-700">
            Vínculo Societário
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="cargo" className="mb-1 block text-sm font-medium text-gray-700">
                Cargo / Função *
              </label>
              <select
                id="cargo"
                value={data.cargoFuncao}
                onChange={(event) => change('cargoFuncao', event.target.value)}
                className={`w-full rounded-md border p-2 focus:border-primary focus:ring-primary ${errors.cargoFuncao ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={!!errors.cargoFuncao}
                aria-describedby={errors.cargoFuncao ? 'cargo-error' : undefined}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {CARGOS.map((cargo) => (
                  <option key={cargo} value={cargo}>
                    {cargo}
                  </option>
                ))}
              </select>
              {errors.cargoFuncao && (
                <p id="cargo-error" role="alert" className="mt-1 text-sm text-red-500">
                  {errors.cargoFuncao}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="participacao"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Participação Societária: {data.participacaoSocietaria}%
              </label>
              <input
                type="range"
                id="participacao"
                min="0"
                max="100"
                value={data.participacaoSocietaria}
                onChange={(event) => change('participacaoSocietaria', Number(event.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-700">
            Documento e Endereço
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              id="cpf"
              label="CPF *"
              placeholder="000.000.000-00"
              value={data.cpf}
              onChange={(event) => change('cpf', event.target.value)}
              onBlur={handleBlurCPF}
              error={errors.cpf}
            />
            <Input
              id="dateOfBirth"
              type="date"
              label="Data de nascimento *"
              value={data.dateOfBirth}
              onChange={(event) => change('dateOfBirth', event.target.value)}
              error={errors.dateOfBirth}
            />
            <Input
              id="phone"
              label="Telefone *"
              placeholder="(00) 00000-0000"
              value={data.phone}
              onChange={(event) => change('phone', event.target.value)}
              error={errors.phone}
            />
            <Input
              id="cep"
              label="CEP *"
              placeholder="00000-000"
              value={data.cep}
              onChange={(event) => change('cep', event.target.value)}
              error={errors.cep}
            />
            <div className="md:col-span-2">
              <Input
                id="linhaEndereco"
                label="Linha de endereço *"
                value={data.linhaEndereco}
                onChange={(event) => change('linhaEndereco', event.target.value)}
                error={errors.linhaEndereco}
              />
            </div>
            <Input
              id="cidade"
              label="Cidade *"
              value={data.cidade}
              onChange={(event) => change('cidade', event.target.value)}
              error={errors.cidade}
            />
            <div>
              <label htmlFor="estado" className="mb-1 block text-sm font-medium text-gray-700">
                Estado *
              </label>
              <select
                id="estado"
                value={data.estado}
                onChange={(event) => change('estado', event.target.value)}
                className={`w-full rounded-md border p-2 focus:border-primary focus:ring-primary ${errors.estado ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={!!errors.estado}
                aria-describedby={errors.estado ? 'estado-error' : undefined}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {ESTADOS.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.nome}
                  </option>
                ))}
              </select>
              {errors.estado && (
                <p id="estado-error" role="alert" className="mt-1 text-sm text-red-500">
                  {errors.estado}
                </p>
              )}
            </div>
            <Input
              id="pais"
              label="País *"
              value={data.pais}
              onChange={(event) => change('pais', event.target.value)}
              error={errors.pais}
            />
          </div>
        </section>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:justify-end md:gap-[70px]">
          <div className="md:w-[170px]">
            <Button
              type="button"
              variant="neutral"
              label="Voltar"
              onClick={onBack}
              className="h-12 font-medium"
            />
          </div>
          <div className="md:w-[170px]">
            <Button type="submit" label="Continuar" className="h-12 font-medium" />
          </div>
        </div>
      </form>
    </main>
  )
}
