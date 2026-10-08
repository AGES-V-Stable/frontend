import { useEffect, useState } from 'react'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { AdminNavIcon } from '@/components/Sidebar'
import { Stepper } from '@/components/Stepper'
import { TransferAmountSchema, TransferFormSchema } from '@/schemas/transfer'
import { getBeneficiaries } from '@/services/beneficiary'
import { HttpError } from '@/services/httpClient'
import { createTransfer, getTransferQuote } from '@/services/transfers'
import { getCurrentUser } from '@/services/user'
import type { Beneficiary } from '@/types/beneficiary'
import type {
  TransactionStatus,
  TransferAmountType,
  TransferPaymentMethod,
  TransferQuoteResponse,
} from '@/types/transfer'
import {
  currencySymbol,
  formatDecimal,
  formatMoney,
  formatPercent,
  parseDecimalInput,
} from '@/utils/formatters'

const TRANSFER_STEPS = ['Dados', 'Revisão', 'Autenticação']

// Mesmo visual do Input para os campos nativos (select e textarea) da tela.
const FIELD_CLASS =
  'w-full rounded-lg border border-sage-300 bg-surface px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const QUOTE_DEBOUNCE_MS = 500
const SOURCE_CURRENCY = 'BRL'
// Moeda usada enquanto nenhum beneficiário com moeda cadastrada foi escolhido (BRL → USD no Figma).
const DEFAULT_DESTINATION_CURRENCY = 'USD'

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

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; quote: TransferQuoteResponse }
  | { status: 'error'; message: string }

type BeneficiariesState =
  { status: 'loading' } | { status: 'ready'; items: Beneficiary[] } | { status: 'error' }

interface FormValues {
  paymentMethod: TransferPaymentMethod | ''
  sourceAmount: string
  destinationAmount: string
  beneficiaryId: string
  description: string
}

const initialValues: FormValues = {
  paymentMethod: 'ACCOUNT_BALANCE',
  sourceAmount: '',
  destinationAmount: '',
  beneficiaryId: '',
  description: '',
}

const beneficiaryName = (beneficiary: Beneficiary) => beneficiary.legalName || beneficiary.nickname

const backendMessage = (error: HttpError) => {
  try {
    const body: unknown = JSON.parse(String(error.body))
    if (typeof body === 'object' && body !== null && 'message' in body) {
      return typeof body.message === 'string' ? body.message : undefined
    }
  } catch {
    /* corpo sem JSON: usa a mensagem genérica */
  }
  return undefined
}

const quoteErrorMessage = (error: unknown) => {
  const fallback = 'Não foi possível obter a cotação. Tente novamente.'
  if (error instanceof HttpError && error.status === 422) return backendMessage(error) ?? fallback
  return fallback
}

const createErrorMessage = (error: unknown) => {
  const fallback = 'Não foi possível criar a transferência. Tente novamente.'
  if (!(error instanceof HttpError)) return fallback
  if (error.status === 404) return 'Beneficiário não encontrado. Selecione outro beneficiário.'
  if (error.status === 422) return backendMessage(error) ?? fallback
  return fallback
}

const isValidAmount = (amount: number | null): amount is number =>
  amount !== null && TransferAmountSchema.safeParse(amount).success

export function TransferCreate() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [amountType, setAmountType] = useState<TransferAmountType>('SOURCE')
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' })
  const [quoteRequestId, setQuoteRequestId] = useState(0)
  const [beneficiaries, setBeneficiaries] = useState<BeneficiariesState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)
  const [createdStatus, setCreatedStatus] = useState<TransactionStatus | undefined>(undefined)

  const editedAmountText = amountType === 'SOURCE' ? values.sourceAmount : values.destinationAmount
  const editedAmount = parseDecimalInput(editedAmountText)
  const beneficiaryList = beneficiaries.status === 'ready' ? beneficiaries.items : []
  const selectedBeneficiary = beneficiaryList.find((item) => item.id === values.beneficiaryId)
  const destinationCurrency = selectedBeneficiary?.currency || DEFAULT_DESTINATION_CURRENCY

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((user) => getBeneficiaries({ companyId: user.companyId, size: 100 }))
      .then((page) => {
        if (!active) return
        if (Array.isArray(page.content)) setBeneficiaries({ status: 'ready', items: page.content })
        else setBeneficiaries({ status: 'error' })
      })
      .catch(() => {
        if (active) setBeneficiaries({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isValidAmount(editedAmount)) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      getTransferQuote(
        {
          amount: editedAmount,
          amountType,
          sourceCurrency: SOURCE_CURRENCY,
          destinationCurrency,
        },
        controller.signal,
      )
        .then((quote) => {
          setQuoteState({ status: 'ready', quote })
          setValues((previous) =>
            amountType === 'SOURCE'
              ? { ...previous, destinationAmount: formatDecimal(quote.destination.amount) }
              : { ...previous, sourceAmount: formatDecimal(quote.source.amount) },
          )
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setQuoteState({ status: 'error', message: quoteErrorMessage(error) })
          }
        })
    }, QUOTE_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [editedAmount, amountType, destinationCurrency, quoteRequestId])

  // Qualquer mudança que afete a cotação invalida a anterior na hora: nada fica exibido como válido.
  function invalidateQuote(nextAmount: number | null) {
    setQuoteState(isValidAmount(nextAmount) ? { status: 'loading' } : { status: 'idle' })
  }

  function handleAmountChange(type: TransferAmountType, text: string) {
    setAmountType(type)
    setValues((previous) =>
      type === 'SOURCE'
        ? { ...previous, sourceAmount: text, destinationAmount: '' }
        : { ...previous, destinationAmount: text, sourceAmount: '' },
    )
    invalidateQuote(parseDecimalInput(text))
    setCreatedStatus(undefined)
  }

  function handleBeneficiaryChange(beneficiaryId: string) {
    const next = beneficiaryList.find((item) => item.id === beneficiaryId)
    const currencyChanged = (next?.currency || DEFAULT_DESTINATION_CURRENCY) !== destinationCurrency
    setValues((previous) => ({
      ...previous,
      beneficiaryId,
      // O valor do lado oposto veio da cotação anterior, que deixa de valer com a nova moeda.
      ...(currencyChanged &&
        (amountType === 'SOURCE' ? { destinationAmount: '' } : { sourceAmount: '' })),
    }))
    if (currencyChanged) invalidateQuote(editedAmount)
    setCreatedStatus(undefined)
  }

  function handleRetryQuote() {
    invalidateQuote(editedAmount)
    setQuoteRequestId((id) => id + 1)
  }

  function handleCancel() {
    setValues(initialValues)
    setAmountType('SOURCE')
    setQuoteState({ status: 'idle' })
    setSubmitError(undefined)
    setCreatedStatus(undefined)
  }

  const form = TransferFormSchema.safeParse({
    amount: editedAmount,
    amountType,
    sourceCurrency: SOURCE_CURRENCY,
    destinationCurrency,
    paymentMethod: values.paymentMethod,
    beneficiaryId: values.beneficiaryId,
    description: values.description,
  })
  const canContinue = form.success && quoteState.status === 'ready' && !submitting

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canContinue || !form.success) return

    setSubmitting(true)
    setSubmitError(undefined)
    createTransfer(form.data)
      .then((result) => {
        setCreatedStatus(result.status)
        setValues(initialValues)
        setAmountType('SOURCE')
        setQuoteState({ status: 'idle' })
      })
      .catch((error: unknown) => setSubmitError(createErrorMessage(error)))
      .finally(() => setSubmitting(false))
  }

  const amountError =
    editedAmountText.trim() !== '' && !isValidAmount(editedAmount)
      ? 'Informe um valor maior que zero'
      : undefined
  const quote = quoteState.status === 'ready' ? quoteState.quote : undefined

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
              <AdminNavIcon id="transfers" />
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
