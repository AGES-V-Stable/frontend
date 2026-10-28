import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'

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
const REDES_BLOCKCHAIN = ['Polygon', 'Celo', 'Ethereum', 'Gnosis', 'Moonbeam', 'Tron']

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

const bankFields: { name: Field; label: string; placeholder: string }[] = [
  { name: 'banco', label: 'Banco', placeholder: 'Ex.: Banco XYZ' },
  { name: 'swiftBic', label: 'SWIFT / BIC', placeholder: 'Ex.: BOFAUS3N' },
  {
    name: 'ibanNumeroConta',
    label: 'IBAN / número da conta',
    placeholder: 'Ex.: BR1800000000141455970000123456',
  },
  { name: 'moedaRecebimento', label: 'Moeda de recebimento', placeholder: 'Ex.: USD' },
  {
    name: 'apelidoConta',
    label: 'Apelido do beneficiário',
    placeholder: 'Ex.: Fornecedor principal',
  },
]

const WALLET_ADDRESS_FIELD = {
  name: 'enderecoWallet' as const,
  label: 'Endereço da wallet',
  placeholder: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
}
const WALLET_NICKNAME_FIELD = {
  name: 'apelidoWallet' as const,
  label: 'Apelido do beneficiário',
  placeholder: 'Ex.: Fornecedor principal',
}

import { useBeneficiaryCreate } from '@/features/beneficiaries/hooks/useBeneficiaryCreate'

export function BeneficiaryCreate() {
  const {
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
  } = useBeneficiaryCreate()
  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Cadastrar beneficiário</h1>
        <p className="text-xs text-slate-500">
          Adicione os dados de quem poderá receber dinheiro pela V-Stable.
        </p>
      </header>

      {success && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-primary"
        >
          Beneficiário cadastrado com sucesso. Já está disponível em Beneficiários.
        </p>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-red-700">
          {serverError}
        </p>
      )}

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-xl border border-sage-300 bg-white px-4 py-[30px] md:px-10"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">Identificação</h2>
            <div className="flex min-h-[102px] flex-col justify-center gap-1">
              <label htmlFor="tipoBeneficiario" className="text-[14px] text-sage-800">
                Tipo de beneficiário *
              </label>
              <select
                id="tipoBeneficiario"
                name="tipoBeneficiario"
                value={data.tipoBeneficiario}
                disabled={saving}
                onChange={(event) => change('tipoBeneficiario', event.target.value)}
                aria-invalid={!!errors.tipoBeneficiario}
                className={`w-full rounded-lg border bg-surface px-3 py-3.5 text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  errors.tipoBeneficiario ? 'border-red-700' : 'border-sage-300'
                }`}
              >
                {TIPOS_BENEFICIARIO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {errors.tipoBeneficiario && (
                <p role="alert" className="text-sm text-red-700">
                  {errors.tipoBeneficiario}
                </p>
              )}
            </div>
            {identificationFields.map(({ name, label, placeholder }) => (
              <div key={name} className="flex min-h-[102px] items-center">
                <Input
                  id={`beneficiary-${name}`}
                  name={name}
                  label={`${label} *`}
                  placeholder={placeholder}
                  disabled={saving}
                  value={data[name]}
                  onChange={(event) => change(name, event.target.value)}
                  error={errors[name]}
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">Dados bancários</h2>
            <div
              role="tablist"
              aria-label="Tipo de recebimento"
              className="inline-flex w-fit rounded-full border border-sage-300 bg-white p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === 'conta_bancaria'}
                disabled={saving}
                onClick={() => setMethod('conta_bancaria')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  method === 'conta_bancaria'
                    ? 'bg-primary text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Conta bancária
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === 'wallet_cripto'}
                disabled={saving}
                onClick={() => setMethod('wallet_cripto')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  method === 'wallet_cripto'
                    ? 'bg-primary text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Wallet cripto
              </button>
            </div>

            {method === 'conta_bancaria' ? (
              bankFields.map(({ name, label, placeholder }) => (
                <div key={name} className="flex min-h-[102px] items-center">
                  <Input
                    id={`beneficiary-${name}`}
                    name={name}
                    label={`${label} *`}
                    placeholder={placeholder}
                    disabled={saving}
                    value={data[name]}
                    onChange={(event) => change(name, event.target.value)}
                    error={errors[name]}
                  />
                </div>
              ))
            ) : (
              <>
                <div className="flex min-h-[102px] items-center">
                  <Input
                    id="beneficiary-enderecoWallet"
                    name={WALLET_ADDRESS_FIELD.name}
                    label={`${WALLET_ADDRESS_FIELD.label} *`}
                    placeholder={WALLET_ADDRESS_FIELD.placeholder}
                    disabled={saving}
                    value={data.enderecoWallet}
                    onChange={(event) => change('enderecoWallet', event.target.value)}
                    error={errors.enderecoWallet}
                  />
                </div>
                <div className="flex min-h-[102px] flex-col justify-center gap-1">
                  <label htmlFor="redeBlockchain" className="text-[14px] text-sage-800">
                    Rede blockchain *
                  </label>
                  <select
                    id="redeBlockchain"
                    name="redeBlockchain"
                    value={data.redeBlockchain}
                    disabled={saving}
                    onChange={(event) => change('redeBlockchain', event.target.value)}
                    aria-invalid={!!errors.redeBlockchain}
                    className={`w-full rounded-lg border bg-surface px-3 py-3.5 text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      errors.redeBlockchain ? 'border-red-700' : 'border-sage-300'
                    }`}
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {REDES_BLOCKCHAIN.map((rede) => (
                      <option key={rede} value={rede}>
                        {rede}
                      </option>
                    ))}
                  </select>
                  {errors.redeBlockchain && (
                    <p role="alert" className="text-sm text-red-700">
                      {errors.redeBlockchain}
                    </p>
                  )}
                </div>
                <div className="flex min-h-[102px] items-center">
                  <Input
                    id="beneficiary-apelidoWallet"
                    name={WALLET_NICKNAME_FIELD.name}
                    label={`${WALLET_NICKNAME_FIELD.label} *`}
                    placeholder={WALLET_NICKNAME_FIELD.placeholder}
                    disabled={saving}
                    value={data.apelidoWallet}
                    onChange={(event) => change('apelidoWallet', event.target.value)}
                    error={errors.apelidoWallet}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmacao" className="flex items-center gap-2 text-sm text-slate-900">
            <input
              type="checkbox"
              id="confirmacao"
              name="confirmacao"
              checked={confirmado}
              disabled={saving}
              onChange={(event) => {
                setConfirmado(event.target.checked)
                if (event.target.checked) setConfirmError(undefined)
              }}
            />
            Confirmo que os dados foram revisados e pertencem ao beneficiário informado.
          </label>
          {confirmError && (
            <p role="alert" className="text-sm text-red-700">
              {confirmError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end md:gap-[70px]">
          <div className="md:w-[170px]">
            <Button
              type="button"
              variant="neutral"
              label="Cancelar"
              onClick={handleCancel}
              disabled={saving}
              className="h-12 font-medium"
            />
          </div>
          <div className="md:w-[170px]">
            <Button
              type="submit"
              disabled={saving}
              label={saving ? 'Salvando...' : 'Salvar beneficiário'}
              className="h-12 font-medium"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
