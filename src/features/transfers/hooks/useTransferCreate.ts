import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { z } from 'zod'

import { TransferAmountSchema, TransferFormSchema } from '@/features/transfers/schemas/transfer'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'
import { HttpError } from '@/shared/http/httpClient'
import {
  confirmOffer,
  confirmRequote,
  createQuote,
  getTransferExecution,
} from '@/features/transfers/api/transfers'
import { useSession } from '@/features/auth'
import type { Beneficiary } from '@/features/beneficiaries'
import type {
  FundingMethod,
  QuoteResponse,
  TransferAmountType,
  TransferExecution,
  TransferExecutionStatus,
  WalletToken,
} from '@/features/transfers/types/transfer'
import { formatDecimal, parseDecimalInput } from '@/shared/utils/formatters'

const QUOTE_DEBOUNCE_MS = 500
export const EXECUTION_POLL_MS = 5000
/** Identifica na URL a transferência em pagamento: recarregar a página a retoma pelo backend. */
export const EXECUTION_PARAM = 'execucao'
const SOURCE_CURRENCY = 'BRL'
// Moeda exibida enquanto nenhum beneficiário com moeda cadastrada foi escolhido (BRL → USD no Figma).
const DEFAULT_DESTINATION_CURRENCY = 'USD'
// O backend não acompanha execuções da Avenia depois do ticket: consultar de novo não muda nada.
const UNTRACKED_PROVIDER = 'AVENIA'

/** Estados em que o provedor ainda vai avançar a execução sem ação do usuário. */
const IN_PROGRESS_STATUSES = new Set<TransferExecutionStatus>([
  'PENDING_SUBMISSION',
  'AWAITING_FUNDS',
  'FUNDS_RECEIVED',
  'PAYOUT_SUBMITTING',
  'PAYOUT_PROCESSING',
  'SUBMITTED',
])

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; quote: QuoteResponse }
  | { status: 'expired' }
  | { status: 'error'; message: string }

type BeneficiariesState =
  { status: 'loading' } | { status: 'ready'; items: Beneficiary[] } | { status: 'error' }

interface FormValues {
  paymentMethod: FundingMethod | ''
  sourceAmount: string
  destinationAmount: string
  beneficiaryId: string
  walletToken: WalletToken | ''
  description: string
}

const initialValues: FormValues = {
  paymentMethod: 'PIX',
  sourceAmount: '',
  destinationAmount: '',
  beneficiaryId: '',
  walletToken: '',
  description: '',
}

const EXPIRED_QUOTE_MESSAGE = 'A cotação expirou ou mudou. Atualize a cotação e confirme novamente.'

const isWallet = (beneficiary: Beneficiary | undefined) =>
  beneficiary?.receivingMethod === 'CRYPTO_WALLET'

/**
 * Moeda e trilho da cotação, sempre vindos de dados reais. Conta bancária: moeda e trilho do
 * cadastro. Carteira cripto: rede do cadastro e token do cadastro ou escolhido pelo usuário.
 */
function quoteTarget(beneficiary: Beneficiary | undefined, walletToken: WalletToken | '') {
  if (!beneficiary) return null
  if (isWallet(beneficiary)) {
    const currency = beneficiary.currency || walletToken
    return currency && beneficiary.blockchainNetwork
      ? { currency, rail: beneficiary.blockchainNetwork }
      : null
  }
  return beneficiary.currency && beneficiary.paymentRail
    ? { currency: beneficiary.currency, rail: beneficiary.paymentRail }
    : null
}

/** A Avenia, única que cota carteira cripto, só recebe BRL por PIX; TED é da BlindPay. */
const fundingMethodsFor = (beneficiary: Beneficiary | undefined): FundingMethod[] =>
  isWallet(beneficiary) ? ['PIX'] : ['PIX', 'TED']

const quoteErrorMessage = (error: unknown) => {
  if (error instanceof HttpError && error.status === 422)
    return 'Nenhuma cotação disponível para este beneficiário e método de pagamento.'
  if (error instanceof HttpError && error.status === 404)
    return 'Beneficiário não encontrado. Selecione outro beneficiário.'
  return 'Não foi possível obter a cotação. Tente novamente.'
}

const confirmErrorMessage = (error: unknown) => {
  if (!(error instanceof HttpError)) return 'Não foi possível confirmar a transferência.'
  if (error.status === 403) return 'Você não tem permissão para realizar esta transferência.'
  if (error.status === 404 || error.status === 409 || error.status === 410 || error.status === 422)
    return EXPIRED_QUOTE_MESSAGE
  return 'Não foi possível confirmar a transferência. Tente novamente.'
}

const restoreErrorMessage = (error: unknown) =>
  error instanceof HttpError && error.status === 404
    ? 'Transferência não encontrada para a sua empresa.'
    : 'Não foi possível carregar a transferência. Tente novamente.'

const isUuid = (value: string) => z.uuid().safeParse(value).success

/** A oferta só vale até `expiresAt`; o backend recusa confirmações depois disso. */
const millisUntil = (isoDate: string | null) =>
  isoDate === null ? Number.POSITIVE_INFINITY : new Date(isoDate).getTime() - Date.now()

const isFutureIsoDate = (isoString: string | null | undefined): boolean => {
  if (!isoString) return false
  const time = new Date(isoString).getTime()
  return !Number.isNaN(time) && time > Date.now()
}

const isValidAmount = (amount: number | null): amount is number =>
  amount !== null && TransferAmountSchema.safeParse(amount).success

export function useTransferCreate() {
  const session = useSession()
  const user = session.user
  const companyId = user?.companyId
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeStep, setActiveStep] = useState<number>(0)
  const [values, setValues] = useState<FormValues>(initialValues)
  const [amountType, setAmountType] = useState<TransferAmountType>('SOURCE')
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' })
  const [quoteRequestId, setQuoteRequestId] = useState(0)
  const [beneficiaries, setBeneficiaries] = useState<BeneficiariesState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)
  const [execution, setExecution] = useState<TransferExecution | null>(null)
  const [pollAttempt, setPollAttempt] = useState(0)
  const [pollError, setPollError] = useState(false)
  const [restoreFailure, setRestoreFailure] = useState<{ id: string; message: string } | null>(null)
  // A URL é atualizada numa transição do router: até lá, a execução deixada não é recarregada.
  const [leftExecutionId, setLeftExecutionId] = useState<string | null>(null)

  // O backend é a fonte da trava, entregue no perfil do usuário.
  const rawLockedUntil = user?.withdrawalLockedUntil
  const isWithdrawalLocked = isFutureIsoDate(rawLockedUntil)
  const withdrawalLockedUntil = isWithdrawalLocked ? rawLockedUntil : null

  // Execução indicada na URL e ainda não carregada: a página a retoma em vez de abrir o formulário.
  const urlExecutionId = searchParams.get(EXECUTION_PARAM)
  const executionParam = urlExecutionId === leftExecutionId ? null : urlExecutionId
  const restoreError =
    executionParam === null
      ? undefined
      : !isUuid(executionParam)
        ? 'O link desta transferência é inválido.'
        : restoreFailure?.id === executionParam
          ? restoreFailure.message
          : undefined
  const restoring =
    executionParam !== null &&
    restoreError === undefined &&
    execution?.executionId !== executionParam
  const canRetryRestore = executionParam !== null && restoreFailure?.id === executionParam

  const editedAmountText = amountType === 'SOURCE' ? values.sourceAmount : values.destinationAmount
  const editedAmount = parseDecimalInput(editedAmountText)
  const beneficiaryList = beneficiaries.status === 'ready' ? beneficiaries.items : []
  const selectedBeneficiary = beneficiaryList.find((item) => item.id === values.beneficiaryId)
  const target = quoteTarget(selectedBeneficiary, values.walletToken)
  // Carteira sem token cadastrado: o usuário escolhe o token; nada é presumido.
  const needsWalletToken = isWallet(selectedBeneficiary) && !selectedBeneficiary?.currency
  const beneficiaryMissingData = Boolean(
    selectedBeneficiary &&
    (isWallet(selectedBeneficiary)
      ? !selectedBeneficiary.blockchainNetwork
      : !selectedBeneficiary.currency || !selectedBeneficiary.paymentRail),
  )
  const fundingMethods = fundingMethodsFor(selectedBeneficiary)
  const destinationCurrency = target?.currency || DEFAULT_DESTINATION_CURRENCY
  const quoteCurrency = target?.currency ?? null
  const quoteRail = target?.rail ?? null
  const paymentMethod = values.paymentMethod
  const beneficiaryId = values.beneficiaryId
  const description = values.description.trim()
  const canQuote = isValidAmount(editedAmount) && target !== null && paymentMethod !== ''

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

  // Retoma a execução da URL pelo backend, que só a devolve para a empresa do usuário.
  useEffect(() => {
    if (!restoring || executionParam === null) return
    const controller = new AbortController()
    getTransferExecution(executionParam, controller.signal)
      .then((restored) => {
        if (controller.signal.aborted) return
        setExecution(restored)
        setPollError(false)
        setActiveStep(2)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setRestoreFailure({ id: executionParam, message: restoreErrorMessage(error) })
      })
    return () => controller.abort()
  }, [restoring, executionParam])

  useEffect(() => {
    if (!isValidAmount(editedAmount) || !quoteCurrency || !quoteRail || paymentMethod === '') return
    const amount = editedAmount
    const sourcePaymentMethod = paymentMethod

    const controller = new AbortController()
    const timer = setTimeout(() => {
      createQuote(
        {
          beneficiaryId,
          direction: 'PAYOUT',
          sourceCurrency: SOURCE_CURRENCY,
          targetCurrency: quoteCurrency,
          sourcePaymentMethod,
          targetPaymentMethod: quoteRail,
          amount,
          amountSide: amountType === 'SOURCE' ? 'SOURCE' : 'TARGET',
          coverFees: false,
          ...(description ? { description } : {}),
        },
        controller.signal,
      )
        .then((quote) => {
          if (controller.signal.aborted) return
          setQuoteState({ status: 'ready', quote })
          setValues((previous) =>
            amountType === 'SOURCE'
              ? { ...previous, destinationAmount: formatDecimal(quote.offer.targetAmount) }
              : { ...previous, sourceAmount: formatDecimal(quote.offer.sourceAmount) },
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
  }, [
    editedAmount,
    amountType,
    beneficiaryId,
    paymentMethod,
    quoteCurrency,
    quoteRail,
    description,
    quoteRequestId,
  ])

  // Ao vencer, a oferta deixa de ser exibida como válida e precisa ser atualizada.
  const readyExpiresAt = quoteState.status === 'ready' ? quoteState.quote.offer.expiresAt : null
  useEffect(() => {
    if (readyExpiresAt === null) return
    const timer = setTimeout(
      () => {
        setQuoteState({ status: 'expired' })
        // Na revisão, a oferta vencida não pode mais ser confirmada: volta aos dados.
        if (activeStep === 1) {
          setSubmitError(EXPIRED_QUOTE_MESSAGE)
          setActiveStep(0)
        }
      },
      Math.max(0, millisUntil(readyExpiresAt)),
    )
    return () => clearTimeout(timer)
  }, [readyExpiresAt, activeStep])

  // Acompanha a execução enquanto o provedor ainda vai movê-la.
  const executionId = execution?.executionId
  const executionStatus = execution?.status
  const executionTracked = execution?.provider !== UNTRACKED_PROVIDER
  useEffect(() => {
    if (
      !executionId ||
      !executionStatus ||
      !executionTracked ||
      !IN_PROGRESS_STATUSES.has(executionStatus)
    )
      return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      getTransferExecution(executionId, controller.signal)
        .then((next) => {
          if (controller.signal.aborted) return
          setPollError(false)
          setExecution(next)
          setPollAttempt((attempt) => attempt + 1)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setPollError(true)
          setPollAttempt((attempt) => attempt + 1)
        })
    }, EXECUTION_POLL_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [executionId, executionStatus, executionTracked, pollAttempt])

  // Qualquer mudança que afete a cotação invalida a anterior na hora: nada fica exibido como válido.
  function invalidateQuote(willQuote: boolean) {
    setQuoteState(willQuote ? { status: 'loading' } : { status: 'idle' })
  }

  // O valor do lado oposto veio da cotação anterior, que deixa de valer.
  const clearCalculatedAmount = () =>
    amountType === 'SOURCE' ? { destinationAmount: '' } : { sourceAmount: '' }

  function handleAmountChange(type: TransferAmountType, text: string) {
    setAmountType(type)
    setValues((previous) =>
      type === 'SOURCE'
        ? { ...previous, sourceAmount: text, destinationAmount: '' }
        : { ...previous, destinationAmount: text, sourceAmount: '' },
    )
    invalidateQuote(
      isValidAmount(parseDecimalInput(text)) && target !== null && values.paymentMethod !== '',
    )
  }

  function handleBeneficiaryChange(beneficiaryId: string) {
    const next = beneficiaryList.find((item) => item.id === beneficiaryId)
    // O token escolhido vale só para a carteira em que foi escolhido.
    const nextPaymentMethod =
      values.paymentMethod !== '' && !fundingMethodsFor(next).includes(values.paymentMethod)
        ? 'PIX'
        : values.paymentMethod
    setValues((previous) => ({
      ...previous,
      beneficiaryId,
      walletToken: '',
      paymentMethod: nextPaymentMethod,
      ...clearCalculatedAmount(),
    }))
    invalidateQuote(
      isValidAmount(editedAmount) && quoteTarget(next, '') !== null && nextPaymentMethod !== '',
    )
  }

  function handleWalletTokenChange(walletToken: WalletToken | '') {
    setValues((previous) => ({ ...previous, walletToken, ...clearCalculatedAmount() }))
    invalidateQuote(
      isValidAmount(editedAmount) &&
        quoteTarget(selectedBeneficiary, walletToken) !== null &&
        values.paymentMethod !== '',
    )
  }

  function handlePaymentMethodChange(paymentMethod: FundingMethod | '') {
    setValues((previous) => ({ ...previous, paymentMethod, ...clearCalculatedAmount() }))
    invalidateQuote(isValidAmount(editedAmount) && target !== null && paymentMethod !== '')
  }

  function handleDescriptionChange(text: string) {
    setValues((previous) => ({ ...previous, description: text }))
    if (text.trim() !== description) invalidateQuote(canQuote)
  }

  function handleRetryQuote() {
    invalidateQuote(canQuote)
    setQuoteRequestId((id) => id + 1)
  }

  function handleRetryRestore() {
    setRestoreFailure(null)
  }

  /** Volta ao formulário. A transferência anterior continua no backend; nada é cancelado. */
  function handleCancel() {
    setValues(initialValues)
    setAmountType('SOURCE')
    setQuoteState({ status: 'idle' })
    setSubmitError(undefined)
    setExecution(null)
    setPollError(false)
    setRestoreFailure(null)
    setActiveStep(0)
    if (urlExecutionId !== null) {
      setLeftExecutionId(urlExecutionId)
      setSearchParams(
        (params) => {
          params.delete(EXECUTION_PARAM)
          return params
        },
        { replace: true },
      )
    }
  }

  const form = TransferFormSchema.safeParse({
    amount: editedAmount,
    amountType,
    paymentMethod: values.paymentMethod,
    beneficiaryId: values.beneficiaryId,
    description: values.description,
  })
  const quote = quoteState.status === 'ready' ? quoteState.quote : undefined
  const canContinue = form.success && quote !== undefined && !submitting && !isWithdrawalLocked

  function handleNextStep() {
    if (!canContinue) return
    setSubmitError(undefined)
    setActiveStep(1)
  }

  function handlePreviousStep() {
    setSubmitError(undefined)
    setActiveStep(0)
  }

  function returnWithExpiredQuote() {
    setSubmitError(EXPIRED_QUOTE_MESSAGE)
    setQuoteState({ status: 'expired' })
    setActiveStep(0)
  }

  function handleConfirm() {
    if (activeStep !== 1 || submitting || isWithdrawalLocked) return
    if (!quote || millisUntil(quote.offer.expiresAt) <= 0) {
      returnWithExpiredQuote()
      return
    }

    setSubmitting(true)
    setSubmitError(undefined)
    // Envia exatamente os valores exibidos: o backend recusa qualquer diferença da oferta.
    confirmOffer(quote.offer.offerId, {
      sourceAmount: quote.offer.sourceAmount,
      targetAmount: quote.offer.targetAmount,
    })
      .then((result) => {
        setExecution(result)
        setPollError(false)
        setActiveStep(2)
        // Com o id na URL, recarregar a página retoma esta execução em vez de criar outra.
        setSearchParams(
          (params) => {
            params.set(EXECUTION_PARAM, result.executionId)
            return params
          },
          { replace: true },
        )
      })
      .catch((error: unknown) => {
        const message = confirmErrorMessage(error)
        if (message === EXPIRED_QUOTE_MESSAGE) returnWithExpiredQuote()
        else setSubmitError(message)
      })
      .finally(() => setSubmitting(false))
  }

  function handleConfirmRequote() {
    if (!execution?.requote || submitting) return
    setSubmitting(true)
    setSubmitError(undefined)
    confirmRequote(execution.executionId, {
      sourceAmount: execution.requote.source.amount,
      targetAmount: execution.requote.target.amount,
    })
      .then(setExecution)
      .catch((error: unknown) =>
        setSubmitError(
          error instanceof HttpError && [409, 410, 422].includes(error.status)
            ? 'A nova cotação expirou. Aguarde uma nova cotação para confirmar.'
            : 'Não foi possível confirmar a nova cotação. Tente novamente.',
        ),
      )
      .finally(() => setSubmitting(false))
  }

  const amountError =
    editedAmountText.trim() !== '' && !isValidAmount(editedAmount)
      ? 'Informe um valor maior que zero'
      : undefined

  return {
    activeStep,
    selectedBeneficiary,
    beneficiaryMissingData,
    needsWalletToken,
    fundingMethods,
    values,
    amountType,
    quoteState,
    beneficiaries,
    submitting,
    submitError,
    execution,
    executionTracked,
    pollError,
    restoring,
    restoreError,
    canRetryRestore,
    beneficiaryList,
    destinationCurrency,
    canContinue,
    amountError,
    quote,
    isWithdrawalLocked,
    withdrawalLockedUntil,
    handleAmountChange,
    handleBeneficiaryChange,
    handleWalletTokenChange,
    handlePaymentMethodChange,
    handleDescriptionChange,
    handleRetryQuote,
    handleRetryRestore,
    handleCancel,
    handleNextStep,
    handlePreviousStep,
    handleConfirm,
    handleConfirmRequote,
  }
}
