import { useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { maskCEP, maskCPF } from '@/utils/masks'
import { isValidCPF } from '@/utils/validators'
import type { RepresentativeData } from '@/types/registration'
import { RegistrationHeader } from './RegistrationHeader'

export type { RepresentativeData } from '@/types/registration'

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

interface RepresentativeStepProps {
  initialValues?: Partial<RepresentativeData>
  onContinue: (data: RepresentativeData) => void
  saving?: boolean
  serverError?: string
}

function validateForm(data: RepresentativeData) {
  const errors: Partial<Record<keyof RepresentativeData, string>> = {}
  if (!data.cargo_funcao) errors.cargo_funcao = 'Cargo é obrigatório'
  if (!data.cpf) errors.cpf = 'CPF é obrigatório'
  else if (!isValidCPF(data.cpf)) errors.cpf = 'CPF inválido'

  if (!data.cep) errors.cep = 'CEP é obrigatório'
  else if (data.cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido'

  if (!data.cidade) errors.cidade = 'Cidade é obrigatória'
  if (!data.estado) errors.estado = 'Estado é obrigatório'
  if (!data.pais) errors.pais = 'País é obrigatório'
  if (!data.linha_endereco) errors.linha_endereco = 'Endereço é obrigatório'

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
    cidade: '',
    estado: '',
    pais: '',
    linha_endereco: '',
    ...initialValues,
    cpf: maskCPF(initialValues?.cpf ?? ''),
    cep: maskCEP(initialValues?.cep ?? ''),
  }))

  const [errors, setErrors] = useState<Partial<Record<keyof RepresentativeData, string>>>({})

  const handleInputChange = (field: keyof RepresentativeData, value: string | number) => {
    let formattedValue = value
    if (field === 'cpf') formattedValue = maskCPF(value as string)
    if (field === 'cep') formattedValue = maskCEP(value as string)

    setFormData((prev) => ({ ...prev, [field]: formattedValue }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleBlurCPF = () => {
    if (formData.cpf && !isValidCPF(formData.cpf)) {
      setErrors((prev) => ({ ...prev, cpf: 'CPF inválido' }))
    }
  }

  const handleSubmit = () => {
    if (saving) return
    const nextErrors = validateForm(formData)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onContinue({ ...formData })
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-[#BBCABF] bg-white px-4 py-[30px] md:px-10">
        <RegistrationHeader
          activeStep={2}
          description="Informe os dados do representante legal da empresa."
        />
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Dados do Representante</h2>

          {serverError && (
            <div
              className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
              Vínculo Societário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo / Função *
                </label>
                <select
                  id="cargo"
                  value={formData.cargo_funcao}
                  disabled={saving}
                  onChange={(e) => handleInputChange('cargo_funcao', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-primary focus:border-primary ${errors.cargo_funcao ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={!!errors.cargo_funcao}
                  aria-describedby={errors.cargo_funcao ? 'cargo-error' : undefined}
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
                {errors.cargo_funcao && (
                  <p id="cargo-error" role="alert" className="mt-1 text-sm text-red-500">
                    {errors.cargo_funcao}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="participacao"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
              Documento e Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  id="estado"
                  value={formData.estado}
                  disabled={saving}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-primary focus:border-primary ${errors.estado ? 'border-red-500' : 'border-gray-300'}`}
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
              <div>
                <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-1">
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

          <div className="flex justify-end items-center mt-8 pt-4 border-t">
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
