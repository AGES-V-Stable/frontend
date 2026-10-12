import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { ActionIcon } from '@/shared/components/Icons/ActionIcon'
import { Stepper } from '@/shared/components/Stepper'
import type { Beneficiary } from '@/features/beneficiaries'
import type { TransactionStatus, TransferPaymentMethod } from '@/features/transfers/types/transfer'
import { currencySymbol, formatMoney, formatPercent } from '@/shared/utils/formatters'

const TRANSFER_STEPS = ['Dados', 'Revisão', 'Autenticação']

// Mesmo visual do Input para os campos nativos (select e textarea) da tela.
const FIELD_CLASS =
  'w-full rounded-lg border border-sage-300 bg-surface px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const SOURCE_CURRENCY = 'BRL'
// Moeda usada enquanto nenhum beneficiário com moeda cadastrada foi escolhido (BRL → USD no Figma).

const PAYMENT_METHODS: { value: TransferPaymentMethod; label: string }[] = [
  { value: 'ACCOUNT_BALANCE', label: 'Saldo em Conta' },
]

const STATUS_LABELS: Record<TransactionStatus, string> = {
  AWAITING_PAYMENT: 'aguardando pagamento',
  PROCESSING: 'em processamento',
  HELD: 'retida para análise',
  SETTLED: 'concluída',
  FAILED: 'com falha',
  PARTIAL_FAILURE: 'com falha parcial',
  CANCELED: 'cancelada',
  EXPIRED: 'expirada',
}

const beneficiaryName = (beneficiary: Beneficiary) => beneficiary.legalName || beneficiary.nickname

import { useTransferCreate } from '@/features/transfers/hooks/useTransferCreate'

export function TransferCreate() {
  const {
    values,
    setValues,
    amountType,
    quoteState,
    beneficiaries,
    submitting,
    submitError,
    createdStatus,
    beneficiaryList,
    destinationCurrency,
    canContinue,
    amountError,
    quote,
    handleAmountChange,
    handleBeneficiaryChange,
    handleRetryQuote,
    handleCancel,
    handleSubmit,
  } = useTransferCreate()
  return (
    <div className="mx-auto flex w-full max-w-[1684px] flex-col gap-6 px-4 py-8 md:px-12">
      <header className="flex flex-col">
        <h1 className="text-xl font-bold text-slate-900">Realizar transferência</h1>
        <p className="text-xs text-slate-500">Informe os dados do pagamento internacional.</p>
      </header>

      <Stepper steps={TRANSFER_STEPS} activeStep={0} className="max-w-[1038px]" />

      {createdStatus && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-primary"
        >
          Transferência criada com sucesso. Status: {STATUS_LABELS[createdStatus]}.
        </p>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1096fr)_minmax(0,468fr)]"
      >
        <section className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">Dados da transferência</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="transfer-paymentMethod" className="text-[14px] text-sage-800">
              Método de Pagamento*
            </label>
            <select
              id="transfer-paymentMethod"
              value={values.paymentMethod}
              disabled={submitting}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  paymentMethod:
                    PAYMENT_METHODS.find((method) => method.value === event.target.value)?.value ??
                    '',
                }))
              }
              className={`${FIELD_CLASS} h-12`}
            >
              <option value="">Selecione o método de pagamento</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
            <Input
              id="transfer-sourceAmount"
              label="Valor de origem*"
              prefix={currencySymbol(SOURCE_CURRENCY)}
              inputMode="decimal"
              placeholder="0,00"
              value={values.sourceAmount}
              disabled={submitting}
              onChange={(event) => handleAmountChange('SOURCE', event.target.value)}
              error={amountType === 'SOURCE' ? amountError : undefined}
              className="h-12 text-[14px]!"
            />
            {/* mt-[25px] = altura do label + espaçamento do Input, para alinhar o ícone ao centro do campo. */}
            <span
              aria-hidden="true"
              className="hidden h-12 w-7 items-center justify-center text-slate-700 md:mt-[25px] md:flex"
            >
              <ActionIcon id="transfers" />
            </span>
            <Input
              id="transfer-destinationAmount"
              label="Valor de Destino*"
              prefix={currencySymbol(destinationCurrency)}
              inputMode="decimal"
              placeholder="0,00"
              value={values.destinationAmount}
              disabled={submitting}
              onChange={(event) => handleAmountChange('DESTINATION', event.target.value)}
              error={amountType === 'DESTINATION' ? amountError : undefined}
              className="h-12 text-[14px]!"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="transfer-beneficiaryId" className="text-[14px] text-sage-800">
              Beneficiário*
            </label>
            <select
              id="transfer-beneficiaryId"
              value={values.beneficiaryId}
              disabled={submitting || beneficiaries.status !== 'ready'}
              onChange={(event) => handleBeneficiaryChange(event.target.value)}
              className={`${FIELD_CLASS} h-12`}
            >
              <option value="">
                {beneficiaries.status === 'loading'
                  ? 'Carregando beneficiários...'
                  : 'Selecione o beneficiário'}
              </option>
              {beneficiaryList.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiaryName(beneficiary)}
                </option>
              ))}
            </select>
            {beneficiaries.status === 'error' && (
              <p role="alert" className="text-sm text-red-500">
                Não foi possível carregar os beneficiários.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="transfer-description" className="text-[14px] text-sage-800">
              Descrição
            </label>
            <textarea
              id="transfer-description"
              placeholder="Pagamento de importação..."
              value={values.description}
              disabled={submitting}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, description: event.target.value }))
              }
              className={`${FIELD_CLASS} h-24 resize-none py-3.5 placeholder:text-gray-500`}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <div className="w-full sm:w-[200px]">
              <Button
                type="button"
                variant="secondary"
                label="Cancelar"
                onClick={handleCancel}
                disabled={submitting}
                className="h-12 font-medium"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Button
                type="submit"
                label={submitting ? 'Enviando...' : 'Continuar'}
                disabled={!canContinue}
                className="h-12 font-medium"
              />
            </div>
          </div>
        </section>

        <aside
          aria-labelledby="transfer-quote-title"
          className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6"
        >
          <h2 id="transfer-quote-title" className="text-sm font-bold text-slate-900">
            Cotação e taxas
          </h2>

          {quoteState.status === 'loading' && (
            <p role="status" className="text-sm text-slate-500">
              Atualizando cotação...
            </p>
          )}
          {quoteState.status === 'idle' && (
            <p className="text-sm text-slate-500">Informe um valor para consultar a cotação.</p>
          )}
          {quoteState.status === 'error' && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-red-700">
                {quoteState.message}
              </p>
              <div>
                <Button
                  type="button"
                  variant="tertiary"
                  label="Tentar novamente"
                  onClick={handleRetryQuote}
                />
              </div>
            </div>
          )}

          <dl className="flex flex-col gap-3 text-sm tabular-nums">
            <div className="flex w-fit flex-col gap-1 rounded-lg bg-blue-50 p-4">
              <dt className="text-sm uppercase text-slate-500">Cotação atual</dt>
              <dd className="text-base font-medium text-slate-900">
                {quote
                  ? `1 ${quote.exchangeRate.fromCurrency} = ${formatMoney(
                      quote.exchangeRate.rate,
                      quote.exchangeRate.toCurrency,
                    )}`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Taxa V-Stable</dt>
              <dd className="font-medium text-primary">
                {quote
                  ? `${formatPercent(quote.fee.percentage)} • ${formatMoney(
                      quote.fee.amount,
                      quote.fee.currency,
                    )}`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Valor total</dt>
              <dd className="font-bold text-slate-900">
                {quote ? formatMoney(quote.total.amount, quote.total.currency) : '—'}
              </dd>
            </div>
          </dl>
        </aside>
      </form>
    </div>
  )
}
