import { useEffect, useState } from 'react'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TransferAmountSchema, TransferFormSchema } from '@/schemas/transfer'
import { getCompanyBeneficiaries } from '@/services/beneficiary'
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
import { formatDecimal, formatMoney, formatPercent, parseDecimalInput } from '@/utils/formatters'

const QUOTE_DEBOUNCE_MS = 500
const SOURCE_CURRENCY = 'BRL'
// Moeda usada enquanto nenhum beneficiário com moeda cadastrada foi escolhido. A demonstração
// usa a rota de stablecoin (carteira cripto), cuja saída padrão no backend é USDC na Polygon.
const DEFAULT_DESTINATION_CURRENCY = 'USDC'

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
      .then((user) => getCompanyBeneficiaries(user.companyId, { size: 100 }))
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
    setValues((previous) => ({ ...previous, beneficiaryId }))
    if ((next?.currency || DEFAULT_DESTINATION_CURRENCY) !== destinationCurrency) {
      invalidateQuote(editedAmount)
    }
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
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#0F172A]">Realizar transferência</h1>
        <p className="text-xs text-[#64748B]">Informe os dados do pagamento internacional.</p>
      </header>

      {createdStatus && (
        <p
          role="status"
          className="rounded-lg bg-[#ECFDF5] px-4 py-3 text-sm font-medium text-[#059669]"
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
        className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <section className="flex flex-col gap-4 rounded-xl border border-[#BBCABF] bg-white px-4 py-[30px] md:px-10">
          <h2 className="text-base font-bold text-[#0F172A]">Dados da transferência</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="transfer-paymentMethod" className="text-[14px] text-[#3C4A42]">
              Método de pagamento *
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
              className="w-full rounded-lg border border-[#BBCABF] bg-[#F8F9FB] px-3 py-3.5 text-[16px]"
            >
              <option value="">Selecione o método de pagamento</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="transfer-sourceAmount"
              label={`Valor de origem (${SOURCE_CURRENCY}) *`}
              inputMode="decimal"
              placeholder="0,00"
              value={values.sourceAmount}
              disabled={submitting}
              onChange={(event) => handleAmountChange('SOURCE', event.target.value)}
              error={amountType === 'SOURCE' ? amountError : undefined}
            />
            <Input
              id="transfer-destinationAmount"
              label={`Valor de destino (${destinationCurrency}) *`}
              inputMode="decimal"
              placeholder="0,00"
              value={values.destinationAmount}
              disabled={submitting}
              onChange={(event) => handleAmountChange('DESTINATION', event.target.value)}
              error={amountType === 'DESTINATION' ? amountError : undefined}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="transfer-beneficiaryId" className="text-[14px] text-[#3C4A42]">
              Beneficiário *
            </label>
            <select
              id="transfer-beneficiaryId"
              value={values.beneficiaryId}
              disabled={submitting || beneficiaries.status !== 'ready'}
              onChange={(event) => handleBeneficiaryChange(event.target.value)}
              className="w-full rounded-lg border border-[#BBCABF] bg-[#F8F9FB] px-3 py-3.5 text-[16px]"
            >
              <option value="">
                {beneficiaries.status === 'loading'
                  ? 'Carregando beneficiários...'
                  : 'Selecione o beneficiário'}
              </option>
              {beneficiaryList.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.currency
                    ? `${beneficiaryName(beneficiary)} · ${beneficiary.currency}`
                    : beneficiaryName(beneficiary)}
                </option>
              ))}
            </select>
            {beneficiaries.status === 'error' && (
              <p role="alert" className="text-sm text-red-500">
                Não foi possível carregar os beneficiários.
              </p>
            )}
          </div>

          <Input
            id="transfer-description"
            label="Descrição"
            placeholder="Pagamento de importação..."
            value={values.description}
            disabled={submitting}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, description: event.target.value }))
            }
          />
        </section>

        <aside
          aria-labelledby="transfer-quote-title"
          className="flex flex-col gap-4 rounded-xl border border-[#BBCABF] bg-white px-4 py-[30px] md:px-6"
        >
          <h2 id="transfer-quote-title" className="text-base font-bold text-[#0F172A]">
            Cotação e taxas
          </h2>

          {quoteState.status === 'loading' && (
            <p role="status" className="text-sm text-[#64748B]">
              Atualizando cotação...
            </p>
          )}
          {quoteState.status === 'idle' && (
            <p className="text-sm text-[#64748B]">Informe um valor para consultar a cotação.</p>
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

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase text-[#64748B]">Cotação atual</dt>
              <dd className="text-lg font-bold text-[#0F172A]">
                {quote
                  ? `1 ${quote.exchangeRate.fromCurrency} = ${formatMoney(
                      quote.exchangeRate.rate,
                      quote.exchangeRate.toCurrency,
                    )}`
                  : '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[#64748B]">Taxa V-Stable</dt>
              <dd className="font-medium text-[#0F172A]">
                {quote
                  ? `${formatPercent(quote.fee.percentage)} • ${formatMoney(
                      quote.fee.amount,
                      quote.fee.currency,
                    )}`
                  : '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[#64748B]">Valor total</dt>
              <dd className="text-lg font-bold text-[#0F172A]">
                {quote ? formatMoney(quote.total.amount, quote.total.currency) : '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex flex-col gap-3">
            <Button
              type="submit"
              label={submitting ? 'Enviando...' : 'Continuar'}
              disabled={!canContinue}
              className="h-12 font-medium"
            />
            <Button
              type="button"
              variant="neutral"
              label="Cancelar"
              onClick={handleCancel}
              disabled={submitting}
              className="h-12 font-medium"
            />
          </div>
        </aside>
      </form>
    </div>
  )
}
