import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import type { RepresentativeData } from '@/features/onboarding/types/registration'
import { maskCEP, maskCPF, maskPhone } from '@/shared/utils/masks'
import { isValidCPF } from '@/shared/utils/validators'
import { RegistrationHeader } from '@/features/onboarding/pages/Register/RegistrationHeader'
import { BRAZILIAN_STATE_OPTIONS } from '@/features/onboarding/model/brazilianStates'
import { Select } from '@/shared/components/Select'

const CARGOS = [
  'Sócio-administrador',
  'Diretor(a)',
  'Administrador(a)',
  'Procurador(a)',
  'Representante legal',
]
const CARGO_OPTIONS = CARGOS.map((cargo) => ({ value: cargo, label: cargo }))

interface RepresentativeStepProps {
  initialValues?: Partial<RepresentativeData>
  onContinue: (data: RepresentativeData) => void
  saving?: boolean
  serverError?: string
}

function validateForm(data: RepresentativeData) {
  const errors: Partial<Record<keyof RepresentativeData, string>> = {}
  if (!data.cargo_funcao) errors.cargo_funcao = 'Informe o cargo.'
  if (!data.cpf) errors.cpf = 'Informe o CPF.'
  else if (!isValidCPF(data.cpf)) errors.cpf = 'Confira o CPF: os dígitos não formam um CPF válido.'
  if (!data.date_of_birth) errors.date_of_birth = 'Informe a data de nascimento.'
  if (!data.phone) errors.phone = 'Informe o telefone.'
  else if (data.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe o telefone com DDD.'

  if (!data.cep) errors.cep = 'Informe o CEP.'
  else if (data.cep.replace(/\D/g, '').length !== 8) errors.cep = 'Informe um CEP com 8 dígitos.'

  if (!data.cidade) errors.cidade = 'Informe a cidade.'
  if (!data.estado) errors.estado = 'Informe o estado.'
  if (!data.pais) errors.pais = 'Informe o país.'
  if (!data.linha_endereco) errors.linha_endereco = 'Informe o endereço.'

  return errors
}

export function RepresentativeStep({
  initialValues,
  onContinue,
  saving = false,
  serverError,
}: RepresentativeStepProps) {
  const [formData, setFormData] = useState<RepresentativeData>(() => ({
    cargo_funcao: '',
    participacao_societaria: 0,
    date_of_birth: '',
    phone: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    linha_endereco: '',
    ...initialValues,
    cpf: maskCPF(initialValues?.cpf ?? ''),
    cep: maskCEP(initialValues?.cep ?? ''),
  }))

  const [errors, setErrors] = useState<Partial<Record<keyof RepresentativeData, string>>>({})

  function handleInputChange<K extends keyof RepresentativeData>(
    field: K,
    value: RepresentativeData[K],
  ) {
    let formatted = value
    if (field === 'cpf') formatted = maskCPF(value as string) as RepresentativeData[K]
    if (field === 'cep') formatted = maskCEP(value as string) as RepresentativeData[K]
    if (field === 'phone') formatted = maskPhone(value as string) as RepresentativeData[K]

    setFormData((previous) => ({ ...previous, [field]: formatted }))
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  function handleBlurCPF() {
    if (formData.cpf && !isValidCPF(formData.cpf)) {
      setErrors((previous) => ({
        ...previous,
        cpf: 'Confira o CPF: os dígitos não formam um CPF válido.',
      }))
    }
  }

  const handleSubmit = () => {
    if (saving) return
    const nextErrors = validateForm(formData)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onContinue({ ...formData })
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-[30px] md:px-10">
        <RegistrationHeader
          activeStep={2}
          description="Informe os dados do representante legal da empresa."
        />
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Dados do Representante</h2>

          {serverError && (
            <div
              className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <section className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-700">
              Vínculo Societário
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="cargo" className="mb-1 block text-sm font-medium text-gray-700">
                  Cargo / Função *
                </label>
                <Select
                  id="cargo"
                  placeholder="Selecione o cargo"
                  options={CARGO_OPTIONS}
                  disabled={saving}
                  value={formData.cargo_funcao}
                  onChange={(e) => handleInputChange('cargo_funcao', e.target.value)}
                  error={errors.cargo_funcao}
                  className="h-[50px] text-sm!"
                />
              </div>

              <div>
                <label
                  htmlFor="participacao"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Participação Societária: {formData.participacao_societaria}%
                </label>
                <input
                  type="range"
                  id="participacao"
                  min="0"
                  max="100"
                  disabled={saving}
                  value={formData.participacao_societaria}
                  onChange={(e) =>
                    handleInputChange('participacao_societaria', Number(e.target.value))
                  }
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-gray-700">
              Documento e Endereço
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="cpf" className="mb-1 block text-sm font-medium text-gray-700">
                  CPF *
                </label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  disabled={saving}
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  onBlur={handleBlurCPF}
                  error={errors.cpf}
                />
              </div>
              <div>
                <label
                  htmlFor="dateOfBirth"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Data de nascimento *
                </label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  disabled={saving}
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  error={errors.date_of_birth}
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                  Telefone *
                </label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  disabled={saving}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={errors.phone}
                />
              </div>
              <div>
                <label htmlFor="cep" className="mb-1 block text-sm font-medium text-gray-700">
                  CEP *
                </label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  disabled={saving}
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  error={errors.cep}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="linha_endereco"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Linha de endereço *
                </label>
                <Input
                  id="linha_endereco"
                  disabled={saving}
                  value={formData.linha_endereco}
                  onChange={(e) => handleInputChange('linha_endereco', e.target.value)}
                  error={errors.linha_endereco}
                />
              </div>
              <div>
                <label htmlFor="cidade" className="mb-1 block text-sm font-medium text-gray-700">
                  Cidade *
                </label>
                <Input
                  id="cidade"
                  disabled={saving}
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  error={errors.cidade}
                />
              </div>
              <div>
                <label htmlFor="estado" className="mb-1 block text-sm font-medium text-gray-700">
                  Estado *
                </label>
                {/* Mesmo campo da etapa Empresa: lista compartilhada e texto de abertura fora da lista. */}
                <Select
                  id="estado"
                  placeholder="Selecione o estado"
                  options={BRAZILIAN_STATE_OPTIONS}
                  disabled={saving}
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  error={errors.estado}
                  className="h-[50px] text-sm!"
                />
              </div>
              <div>
                <label htmlFor="pais" className="mb-1 block text-sm font-medium text-gray-700">
                  País *
                </label>
                <Input
                  id="pais"
                  disabled={saving}
                  value={formData.pais}
                  onChange={(e) => handleInputChange('pais', e.target.value)}
                  error={errors.pais}
                />
              </div>
            </div>
          </section>

          <div className="mt-8 flex items-center justify-end border-t pt-4">
            <Button
              label={saving ? 'Processando...' : 'Continuar'}
              onClick={handleSubmit}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
