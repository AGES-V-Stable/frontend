import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { maskCEP, maskCPF } from '@/utils/masks'
import { isValidCPF } from '@/utils/validators'

interface RepresentativeData {
  cargo_funcao: string
  participacao_societaria: number
  cpf: string
  cep: string
  cidade: string
  estado: string
  pais: string
  linha_endereco: string
}

const CARGOS = [
  'Sócio-administrador',
  'Diretor(a)',
  'Administrador(a)',
  'Procurador(a)',
  'Representante legal',
]

export const RepresentativeStep: React.FC = () => {
  const { progresso_cadastro_id } = useParams<{ progresso_cadastro_id: string }>()
  const navigate = useNavigate()

  const [formData, setFormData] = useState<RepresentativeData>({
    cargo_funcao: '',
    participacao_societaria: 0,
    cpf: '',
    cep: '',
    cidade: '',
    estado: '',
    pais: '',
    linha_endereco: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof RepresentativeData, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`/v1/cadastros/${progresso_cadastro_id}`)
        if (response.status === 404) {
          navigate('/cadastro', { state: { error: 'Cadastro não encontrado ou expirado.' } })
          return
        }
        if (response.ok) {
          const data = await response.json()
          if (data.representante) {
            setFormData({
              ...data.representante,
              cpf: maskCPF(data.representante.cpf) || '',
              cep: maskCEP(data.representante.cep || ''),
            })
          }
        }
      } catch {
        setGlobalError('Não foi possível carregar os dados. Tente novamente.')
      } finally {
        setIsFetching(false)
      }
    }
    fetchInitialData()
  }, [progresso_cadastro_id, navigate])

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!formData.cargo_funcao) newErrors.cargo_funcao = 'Cargo é obrigatório'
    if (!formData.cpf) newErrors.cpf = 'CPF é obrigatório'
    else if (!isValidCPF(formData.cpf)) newErrors.cpf = 'CPF inválido'

    if (!formData.cep) newErrors.cep = 'CEP é obrigatório'
    else if (formData.cep.replace(/\D/g, '').length !== 8) newErrors.cep = 'CEP inválido'

    if (!formData.cidade) newErrors.cidade = 'Cidade é obrigatória'
    if (!formData.estado) newErrors.estado = 'Estado é obrigatório'
    if (!formData.pais) newErrors.pais = 'País é obrigatório'
    if (!formData.linha_endereco) newErrors.linha_endereco = 'Endereço é obrigatório'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setGlobalError(null)

    const payload = {
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, ''),
    }

    try {
      const response = await fetch(`/v1/cadastros/${progresso_cadastro_id}/representante`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        navigate(`/cadastro/${progresso_cadastro_id}/compliance`)
      } else if (response.status === 422) {
        const errorData = await response.json()
        setErrors(errorData.errors || {})
      } else if (response.status === 404) {
        navigate('/cadastro', { state: { error: 'Progresso expirado. Inicie novamente. ' } })
      } else {
        throw new Error('Erro interno')
      }
    } catch {
      setGlobalError('Ocorreu um erro ao salvar os dados. Por favor, tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex justify-center p-8">
        <span
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          aria-label="Carregando"
        ></span>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dados do Representante</h2>

      {globalError && (
        <div
          className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200"
          role="alert"
        >
          {globalError}
        </div>
      )}

      {/* Bloco: Vínculo Societário */}
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
              onChange={(e) => handleInputChange('cargo_funcao', e.target.value)}
              className={`w-full p-2 border rounded-md focus:ring-primary focus:border-primary ${errors.cargo_funcao ? 'border-red-500' : 'border-gray-300'}`}
              aria-invalid={!!errors.cargo_funcao}
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
              <p className="mt-1 text-sm text-red-500">{errors.cargo_funcao}</p>
            )}
          </div>

          <div>
            <label htmlFor="participacao" className="block text-sm font-medium text-gray-700 mb-1">
              Participação Societária: {formData.participacao_societaria}%
            </label>
            <input
              type="range"
              id="participacao"
              min="0"
              max="100"
              value={formData.participacao_societaria}
              onChange={(e) => handleInputChange('participacao_societaria', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
            />
          </div>
        </div>
      </section>

      {/* Bloco: Documento e Endereço */}
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
              onChange={(e) => handleInputChange('estado', e.target.value)}
              className={`w-full p-2 border rounded-md focus:ring-primary focus:border-primary ${errors.estado ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value="SP">São Paulo</option>
              <option value="RJ">Rio de Janeiro</option>
              {/* Adicionar demais estados */}
            </select>
            {errors.estado && <p className="mt-1 text-sm text-red-500">{errors.estado}</p>}
          </div>
          <div>
            <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-1">
              País *
            </label>
            <Input
              id="pais"
              value={formData.pais}
              onChange={(e) => handleInputChange('pais', e.target.value)}
              error={errors.pais}
            />
          </div>
        </div>
      </section>

      {/* Navegação */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t">
        <Button
          label="Voltar"
          variant="secondary"
          onClick={() => navigate(`/cadastro/${progresso_cadastro_id}/acesso`)}
          disabled={isLoading}
        />
        <Button
          label={isLoading ? 'Processando...' : 'Continuar'}
          onClick={handleSubmit}
          disabled={isLoading || Object.keys(errors).length > 0}
        />
      </div>
    </div>
  )
}
