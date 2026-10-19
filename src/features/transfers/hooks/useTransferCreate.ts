import { useEffect, useState } from 'react'

import {
  TotpCodeSchema,
  TransferAmountSchema,
  TransferFormSchema,
} from '@/features/transfers/schemas/transfer'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'
import { HttpError } from '@/shared/http/httpClient'
import { createTransfer, getTransferQuote } from '@/features/transfers/api/transfers'
import { useSession } from '@/features/auth'
import type { Beneficiary } from '@/features/beneficiaries'
import type {
  TransactionStatus,
  TransferAmountType,
  TransferPaymentMethod,
  TransferQuoteResponse,
} from '@/features/transfers/types/transfer'
import { formatDecimal, parseDecimalInput } from '@/shared/utils/formatters'

// Mesmo visual do Input para os campos nativos (select e textarea) da tela.

const QUOTE_DEBOUNCE_MS = 500
const SOURCE_CURRENCY = 'BRL'
// Moeda usada enquanto nenhum beneficiário com moeda cadastrada foi escolhido (BRL → USD no Figma).
const DEFAULT_DESTINATION_CURRENCY = 'USD'

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

const backendMessage = (error: HttpError) => {
  if (
    typeof error.body === 'object' &&
    error.body !== null &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  )
    return error.body.message
  try {
    const body = JSON.parse(String(error.body))
    return typeof body.message === 'string' ? body.message : undefined
  } catch {
    return undefined
  }
}

const quoteErrorMessage = (error: unknown) => {
  const fallback = 'Não foi possível obter a cotação. Tente novamente.'
  if (error instanceof HttpError && error.status === 422) return backendMessage(error) ?? fallback
  return fallback
}

const createErrorMessage = (error: unknown) => {
  const fallback = 'Não foi possível criar a transferência. Tente novamente.'
  if (!(error instanceof HttpError)) return fallback
  if (error.status === 400 || error.status === 401)
    return backendMessage(error) ?? 'Código de autenticação inválido ou expirado.'
  if (error.status === 404) return 'Beneficiário não encontrado. Selecione outro beneficiário.'
  if (error.status === 422) return backendMessage(error) ?? fallback
  return fallback
}

const isValidAmount = (amount: number | null): amount is number =>
  amount !== null && TransferAmountSchema.safeParse(amount).success

export function useTransferCreate() {
  const companyId = useSession().user?.companyId
  const [activeStep, setActiveStep] = useState<number>(0)
  const [totpCode, setTotpCode] = useState('')
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
    const controller = new AbortController()
    if (!companyId) return
    getCompanyBeneficiaries(companyId, { size: 100 }, controller.signal)
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
      controller.abort()
    }
  }, [companyId])

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
          if (controller.signal.aborted) return
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
    setTotpCode('')
    setAmountType('SOURCE')
    setQuoteState({ status: 'idle' })
    setSubmitError(undefined)
    setCreatedStatus(undefined)
    setActiveStep(0)
  }

  function handleNextStep() {
    if (activeStep === 0) {
      if (!canContinue || !form.success) return
      setSubmitError(undefined)
      setActiveStep(1)
    } else if (activeStep === 1) {
      setSubmitError(undefined)
      setActiveStep(2)
    }
  }

  function handlePreviousStep() {
    setSubmitError(undefined)
    if (activeStep === 2) {
      setActiveStep(1)
    } else if (activeStep === 1) {
      setActiveStep(0)
    }
  }

  function handleTotpChange(code: string) {
    setTotpCode(code)
    if (submitError) setSubmitError(undefined)
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

  function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault()
    if (activeStep !== 2) return
    if (!canContinue || !form.success || submitting) return

    const totpValidation = TotpCodeSchema.safeParse(totpCode)
    if (!totpValidation.success) {
      setSubmitError(totpValidation.error.issues[0]?.message ?? 'Código de autenticação inválido.')
      return
    }

    setSubmitting(true)
    setSubmitError(undefined)
    createTransfer({ ...form.data, totpCode })
      .then((result) => {
        setCreatedStatus(result.status)
        setValues(initialValues)
        setTotpCode('')
        setAmountType('SOURCE')
        setQuoteState({ status: 'idle' })
        setActiveStep(0)
      })
      .catch((error: unknown) => setSubmitError(createErrorMessage(error)))
      .finally(() => setSubmitting(false))
  }

  const amountError =
    editedAmountText.trim() !== '' && !isValidAmount(editedAmount)
      ? 'Informe um valor maior que zero'
      : undefined
  const quote = quoteState.status === 'ready' ? quoteState.quote : undefined

  return {
    activeStep,
    setActiveStep,
    totpCode,
    setTotpCode,
    selectedBeneficiary,
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
    form,
    canContinue,
    amountError,
    quote,
    handleAmountChange,
    handleBeneficiaryChange,
    handleRetryQuote,
    handleCancel,
    handleNextStep,
    handlePreviousStep,
    handleTotpChange,
    handleSubmit,
  }
}
