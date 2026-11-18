import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'

interface FormData {
  tipoBeneficiario: string
  razaoSocial: string
  documentoFiscal: string
  pais: string
  endereco: string
  paymentRail: string
  countryCode: string
  bankCountryCode: string
  city: string
  postalCode: string
  banco: string
  swiftBic: string
  ibanNumeroConta: string
  moedaRecebimento: string
  apelidoConta: string
  enderecoWallet: string
  redeBlockchain: string
  apelidoWallet: string
  custodiaWallet: string
  instituicaoCustodiante: string
  paisWallet: string
}

type Field = keyof FormData

const TIPOS_BENEFICIARIO = ['Pessoa jurídica', 'Pessoa física']
const REDES_BLOCKCHAIN = ['Polygon', 'Celo', 'Ethereum', 'Gnosis', 'Moonbeam', 'Tron']

interface TextField {
  name: Field
  label: string
  placeholder: string
  /** Campos longos ocupam a linha inteira da grade. */
  fullWidth?: boolean
  required?: boolean
}

const identificationFields: TextField[] = [
  {
    name: 'razaoSocial',
    label: 'Razão social / Nome completo',
    placeholder: 'Ex.: João da Silva Comércio Ltda.',
  },
  { name: 'documentoFiscal', label: 'Documento fiscal', placeholder: 'CPF ou CNPJ' },
  { name: 'pais', label: 'País', placeholder: 'Brasil' },
  { name: 'endereco', label: 'Endereço', placeholder: 'Rua, número, cidade', fullWidth: true },
]

const bankFields: TextField[] = [
  { name: 'banco', label: 'Banco', placeholder: 'Ex.: Banco XYZ' },
  { name: 'swiftBic', label: 'SWIFT / BIC', placeholder: 'Ex.: BOFAUS3N' },
  {
    name: 'ibanNumeroConta',
    label: 'IBAN / número da conta',
    placeholder: 'Ex.: BR1800000000141455970000123456',
    fullWidth: true,
  },
  { name: 'moedaRecebimento', label: 'Moeda de recebimento', placeholder: 'Ex.: USD' },
  {
    name: 'apelidoConta',
    label: 'Apelido do beneficiário',
    placeholder: 'Ex.: Fornecedor principal',
  },
]

const WALLET_ADDRESS_FIELD: TextField = {
  name: 'enderecoWallet',
  label: 'Endereço da wallet',
  placeholder: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  fullWidth: true,
}
const WALLET_NICKNAME_FIELD: TextField = {
  name: 'apelidoWallet',
  label: 'Apelido do beneficiário',
  placeholder: 'Ex.: Fornecedor principal',
}

// Uma grade só por seção: os campos ficam em pares na mesma linha e se alinham por construção.
const FIELD_GRID = 'grid grid-cols-1 items-start gap-x-6 gap-y-4 md:grid-cols-2'
const SELECT_CLASS =
  'w-full rounded-lg border bg-surface px-3 py-3.5 text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

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

  const textField = ({ name, label, placeholder, fullWidth, required = true }: TextField) => (
    <div key={name} className={fullWidth ? 'md:col-span-2' : undefined}>
      <Input
        id={`beneficiary-${name}`}
        name={name}
        label={required ? `${label} *` : `${label} (opcional)`}
        placeholder={placeholder}
        disabled={saving}
        value={data[name]}
        onChange={(event) => change(name, event.target.value)}
        error={errors[name]}
      />
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Cadastrar beneficiário</h1>
        <p className="text-xs text-slate-600">
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
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-900">Identificação</h2>
          <div className={FIELD_GRID}>
            <div className="flex flex-col gap-1">
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
                className={`${SELECT_CLASS} ${
                  errors.tipoBeneficiario ? 'border-red-700' : 'border-sage-500'
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
            {identificationFields.map(textField)}
          </div>
        </section>

        <hr className="border-sage-300" />

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-900">Dados de recebimento</h2>
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

          <div className={FIELD_GRID}>
            {method === 'conta_bancaria' ? (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="beneficiary-paymentRail" className="text-[14px] text-sage-800">
                    Tipo de transferência *
                  </label>
                  <select
                    id="beneficiary-paymentRail"
                    name="paymentRail"
                    value={data.paymentRail}
                    disabled={saving}
                    onChange={(event) => change('paymentRail', event.target.value)}
                    className={`${SELECT_CLASS} border-sage-500`}
                  >
                    <option value="international_swift">SWIFT internacional</option>
                    <option value="sepa">SEPA (EUR)</option>
                  </select>
                </div>
                {textField({
                  name: 'countryCode',
                  label: `País do beneficiário (código de ${data.paymentRail === 'sepa' ? 3 : 2} letras)`,
                  placeholder: data.paymentRail === 'sepa' ? 'DEU' : 'DE',
                })}
                {textField({
                  name: 'city',
                  label: 'Cidade do beneficiário',
                  placeholder: 'Berlin',
                })}
                {data.paymentRail === 'sepa' &&
                  textField({
                    name: 'postalCode',
                    label: 'Código postal do beneficiário',
                    placeholder: '10115',
                  })}
                {data.paymentRail !== 'sepa' && (
                  <>
                    {textField({
                      name: 'bankCountryCode',
                      label: 'País do banco (código de 2 letras)',
                      placeholder: 'DE',
                    })}
                  </>
                )}
                {bankFields
                  .filter((field) => data.paymentRail !== 'sepa' || field.name !== 'banco')
                  .map((field) =>
                    textField(
                      data.paymentRail === 'sepa' && field.name === 'ibanNumeroConta'
                        ? { ...field, label: 'IBAN', placeholder: 'DE89370400440532013000' }
                        : data.paymentRail === 'sepa' && field.name === 'swiftBic'
                          ? { ...field, required: false }
                          : field,
                    ),
                  )}
              </>
            ) : (
              <>
                {textField(WALLET_ADDRESS_FIELD)}
                <div className="flex flex-col gap-1">
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
                    className={`${SELECT_CLASS} ${
                      errors.redeBlockchain ? 'border-red-700' : 'border-sage-500'
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
                <div className="flex flex-col gap-1">
                  <label htmlFor="wallet-currency" className="text-[14px] text-sage-800">
                    Moeda de recebimento *
                  </label>
                  <select
                    id="wallet-currency"
                    name="moedaRecebimento"
                    value={data.moedaRecebimento}
                    disabled={saving}
                    onChange={(event) => change('moedaRecebimento', event.target.value)}
                    aria-invalid={!!errors.moedaRecebimento}
                    className={`${SELECT_CLASS} ${
                      errors.moedaRecebimento ? 'border-red-700' : 'border-sage-500'
                    }`}
                  >
                    <option value="">Selecione a moeda</option>
                    {['USDC', 'USDT', 'BRLA'].map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  {errors.moedaRecebimento && (
                    <p role="alert" className="text-sm text-red-700">
                      {errors.moedaRecebimento}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="wallet-custody" className="text-[14px] text-sage-800">
                    Custódia da wallet *
                  </label>
                  <select
                    id="wallet-custody"
                    name="custodiaWallet"
                    value={data.custodiaWallet}
                    disabled={saving}
                    onChange={(event) => change('custodiaWallet', event.target.value)}
                    aria-invalid={!!errors.custodiaWallet}
                    className={`${SELECT_CLASS} ${
                      errors.custodiaWallet ? 'border-red-700' : 'border-sage-500'
                    }`}
                  >
                    <option value="">Selecione a custódia</option>
                    <option value="propria">O beneficiário controla as chaves</option>
                    <option value="instituicao">Uma instituição controla as chaves</option>
                  </select>
                  {errors.custodiaWallet && (
                    <p role="alert" className="text-sm text-red-700">
                      {errors.custodiaWallet}
                    </p>
                  )}
                </div>
                {data.custodiaWallet === 'instituicao' && (
                  <Input
                    id="wallet-custodian"
                    name="instituicaoCustodiante"
                    label="Instituição custodiante *"
                    disabled={saving}
                    value={data.instituicaoCustodiante}
                    onChange={(event) => change('instituicaoCustodiante', event.target.value)}
                    error={errors.instituicaoCustodiante}
                  />
                )}
                <Input
                  id="wallet-country"
                  name="paisWallet"
                  label="País do beneficiário (código de 2 letras) *"
                  placeholder="BR"
                  maxLength={2}
                  disabled={saving}
                  value={data.paisWallet}
                  onChange={(event) => change('paisWallet', event.target.value)}
                  error={errors.paisWallet}
                />
                {textField(WALLET_NICKNAME_FIELD)}
              </>
            )}
          </div>
        </section>

        <hr className="border-sage-300" />

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
