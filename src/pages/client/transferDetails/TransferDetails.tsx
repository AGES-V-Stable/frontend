import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'

import { Button } from '@/components/Button'
import { Drawer } from '@/components/Drawer'
import { StatusBadge, type StatusVariant } from '@/components/Table'
import { PATHS } from '@/routes/paths'
import {
  downloadTransferReceipt,
  getTransferDetails,
  saveReceipt,
  TransferDetailsError,
  type TransferDetailsErrorCode,
} from '@/services/transferDetails'
import type { TransactionStatus, TransferPaymentMethod } from '@/types/transfer'
import type {
  TransferCost,
  TransferDetails as TransferDetailsData,
  TransferType,
} from '@/types/transferDetails'
import {
  formatDateTime,
  formatMoney,
  formatMoneyString,
  formatPercentString,
} from '@/utils/formatters'

const UNAVAILABLE = 'Indisponível'

const STATUS: Record<TransactionStatus, { label: string; variant: StatusVariant }> = {
  SETTLED: { label: 'Concluída', variant: 'success' },
  PROCESSING: { label: 'Processando', variant: 'warning' },
  AWAITING_PAYMENT: { label: 'Aguardando pagamento', variant: 'warning' },
  HELD: { label: 'Retida para análise', variant: 'warning' },
  FAILED: { label: 'Com falha', variant: 'error' },
  PARTIAL_FAILURE: { label: 'Falha parcial', variant: 'error' },
  CANCELED: { label: 'Cancelada', variant: 'error' },
  EXPIRED: { label: 'Expirada', variant: 'error' },
}

const FUNDING_SOURCE: Record<TransferPaymentMethod, string> = {
  ACCOUNT_BALANCE: 'Saldo V-Stable',
  PIX: 'PIX',
  TED: 'TED',
  BLOCKCHAIN: 'Blockchain',
}

const TYPE: Record<TransferType, string> = {
  PAGAMENTO: 'Pagamento internacional',
  RECEBIMENTO: 'Recebimento internacional',
}

/** Rótulo de um código vindo da API; código ausente ou fora do mapa devolve undefined. */
function lookup<T>(labels: Record<string, T>, code: string | null): T | undefined {
  return code !== null && Object.hasOwn(labels, code) ? labels[code] : undefined
}

interface ErrorInfo {
  message: string
  /** Falhas passageiras permitem nova tentativa; as demais não mudam ao repetir. */
  retry: boolean
}

const ERRORS: Record<TransferDetailsErrorCode, ErrorInfo> = {
  INVALID_TRANSFER_ID: { message: 'O identificador da transferência é inválido.', retry: false },
  UNAUTHENTICATED: { message: 'Sua sessão expirou. Entre novamente para continuar.', retry: false },
  USER_NOT_VERIFIED: {
    message: 'Para consultar transferências é preciso concluir a verificação do seu cadastro.',
    retry: false,
  },
  COMPANY_ACCESS_REQUIRED: {
    message: 'Seu usuário não possui acesso a uma empresa para consultar transferências.',
    retry: false,
  },
  TRANSFER_NOT_FOUND: { message: 'Transferência não encontrada.', retry: false },
  RECEIPT_UNAVAILABLE: {
    message: 'O comprovante desta transferência ainda não está disponível.',
    retry: false,
  },
  RECEIPT_PROVIDER_ERROR: {
    message: 'Não foi possível obter o comprovante agora. Tente novamente.',
    retry: true,
  },
  INTERNAL_ERROR: {
    message: 'Não foi possível carregar os detalhes da transferência. Tente novamente.',
    retry: true,
  },
  NETWORK_ERROR: {
    message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    retry: true,
  },
  INVALID_RESPONSE: {
    message: 'Recebemos uma resposta inesperada para esta transferência. Tente novamente.',
    retry: true,
  },
}

const codeOf = (error: unknown): TransferDetailsErrorCode =>
  error instanceof TransferDetailsError ? error.code : 'INTERNAL_ERROR'

type Outcome =
  | { status: 'ready'; details: TransferDetailsData }
  | { status: 'error'; code: TransferDetailsErrorCode }

interface ReceiptState {
  forKey: string
  blocked: boolean
  message: string | null
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  )
}

const costLine = (cost: TransferCost) => {
  const percentage = formatPercentString(cost.percentage)
  const amount = formatMoneyString(cost.amount, cost.currency) ?? UNAVAILABLE
  return percentage ? `${percentage} • ${amount}` : amount
}

export function TransferDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reloadCount, setReloadCount] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; outcome: Outcome } | null>(null)
  const [receipt, setReceipt] = useState<ReceiptState | null>(null)
  const [downloading, setDownloading] = useState(false)
  const downloadInFlight = useRef(false)

  // Cada consulta tem uma chave; resultado de outra chave nunca é exibido (sem dados anteriores).
  const requestKey = `${id ?? ''}#${reloadCount}`
  const outcome = loaded?.key === requestKey ? loaded.outcome : null
  const receiptState =
    receipt?.forKey === requestKey ? receipt : { forKey: requestKey, blocked: false, message: null }

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()
    getTransferDetails(id, controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, outcome: { status: 'ready', details } })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, outcome: { status: 'error', code: codeOf(error) } })
        }
      })

    return () => controller.abort()
  }, [id, requestKey])

  const handleClose = () => navigate(PATHS.TRANSFERS)

  async function handleDownload(details: TransferDetailsData) {
    if (downloadInFlight.current) return
    downloadInFlight.current = true
    setDownloading(true)
    setReceipt({ forKey: requestKey, blocked: false, message: null })

    try {
      saveReceipt(await downloadTransferReceipt(details.id))
    } catch (error) {
      const code = codeOf(error)
      setReceipt({
        forKey: requestKey,
        blocked: code === 'RECEIPT_UNAVAILABLE',
        message: ERRORS[code].message,
      })
    } finally {
      downloadInFlight.current = false
      setDownloading(false)
    }
  }

  const details = outcome?.status === 'ready' ? outcome.details : null
  const failureCode: TransferDetailsErrorCode | null = !id
    ? 'INVALID_TRANSFER_ID'
    : outcome?.status === 'error'
      ? outcome.code
      : null
  const failure = failureCode ? ERRORS[failureCode] : null

  const receiptDisabled = !details?.receiptAvailable || receiptState.blocked || downloading

  const actions = details
    ? [
        // Sem ação por enquanto: compartilhar comprovante está fora do escopo da #79.
        { label: 'Compartilhar', type: 'button' as const, variant: 'secondary' as const },
        {
          label: downloading ? 'Baixando...' : 'Baixar comprovante',
          type: 'button' as const,
          disabled: receiptDisabled,
          onClick: () => void handleDownload(details),
        },
      ]
    : []

  return (
    <div className="mx-auto flex w-full max-w-[1684px] flex-col gap-1 px-4 py-8 md:px-12">
      <h1 className="text-xl font-bold text-slate-900">Transferências</h1>
      <p className="text-xs text-slate-500">
        Consulta dos detalhes de uma transferência da empresa.
      </p>

      <Drawer open title="Detalhes da transferência" onClose={handleClose} actions={actions}>
        {failure ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-red-700">
              {failure.message}
            </p>
            {failureCode === 'UNAUTHENTICATED' && (
              <Button
                type="button"
                label="Ir para o login"
                onClick={() => navigate(PATHS.LOGIN)}
                className="!w-auto"
              />
            )}
            {failure.retry && (
              <Button
                type="button"
                variant="secondary"
                label="Tentar novamente"
                onClick={() => setReloadCount((count) => count + 1)}
                className="!w-auto"
              />
            )}
          </div>
        ) : !details ? (
          <p role="status" className="text-sm text-slate-500">
            Carregando detalhes...
          </p>
        ) : (
          <DetailsContent
            details={details}
            receiptMessage={receiptState.message}
            receiptUnavailable={!details.receiptAvailable || receiptState.blocked}
          />
        )}
      </Drawer>
    </div>
  )
}

function DetailsContent({
  details,
  receiptMessage,
  receiptUnavailable,
}: {
  details: TransferDetailsData
  receiptMessage: string | null
  receiptUnavailable: boolean
}) {
  const status = lookup(STATUS, details.status)
  const isReceipt = details.type === 'RECEBIMENTO'
  const { serviceFee, estimatedMarketCost, spreadPercentage } = details.costs
  const spread = formatPercentString(spreadPercentage)

  const hasCosts =
    details.exchangeRate !== null ||
    serviceFee !== null ||
    estimatedMarketCost !== null ||
    spread !== null ||
    details.estimatedSavings !== null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <StatusBadge
          label={status?.label ?? 'Status indisponível'}
          variant={status?.variant ?? 'info'}
        />
      </div>

      <dl className="flex flex-col gap-4">
        <Field label="ID da transferência">
          <span className="break-all">{details.id}</span>
        </Field>
        <Field label={isReceipt ? 'Pagador' : 'Beneficiário'}>
          {details.counterpartyName ?? UNAVAILABLE}
          {details.counterpartyDetails && (
            <span className="block text-xs text-slate-500">{details.counterpartyDetails}</span>
          )}
        </Field>
        <Field label="Data">{formatDateTime(details.date)}</Field>
        <Field label="Tipo">{lookup(TYPE, details.type) ?? UNAVAILABLE}</Field>
        <Field label="Valor de origem">
          {formatMoneyString(details.source.amount, details.source.currency) ?? UNAVAILABLE}
        </Field>
        <Field label="Valor de destino">
          {formatMoneyString(details.destination.amount, details.destination.currency) ??
            UNAVAILABLE}
        </Field>
        <Field label="Origem">
          {lookup(FUNDING_SOURCE, details.fundingSource) ?? (details.fundingSource || UNAVAILABLE)}
        </Field>
      </dl>

      <section aria-labelledby="transfer-costs-title" className="rounded-xl bg-blue-50 p-4">
        <h3
          id="transfer-costs-title"
          className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500"
        >
          Cotação e custos
        </h3>
        {hasCosts ? (
          <dl className="mt-3 flex flex-col gap-3">
            {details.exchangeRate && (
              <Field label="Cotação aplicada">
                {`1 ${details.exchangeRate.fromCurrency} = ${formatMoney(
                  Number(details.exchangeRate.rate),
                  details.exchangeRate.toCurrency,
                )}`}
              </Field>
            )}
            {estimatedMarketCost && (
              <Field label="Mercado estimado">{costLine(estimatedMarketCost)}</Field>
            )}
            {serviceFee && <Field label="Taxa V-Stable">{costLine(serviceFee)}</Field>}
            {spread && <Field label="Spread">{spread}</Field>}
            {details.estimatedSavings && (
              <p className="text-sm font-medium text-primary">
                {`Economia estimada de ${
                  formatMoneyString(
                    details.estimatedSavings.amount,
                    details.estimatedSavings.currency,
                  ) ?? UNAVAILABLE
                }`}
              </p>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Informações de cotação e custos indisponíveis.
          </p>
        )}
      </section>

      {receiptMessage && (
        <p role="alert" className="text-sm text-red-700">
          {receiptMessage}
        </p>
      )}
      {receiptUnavailable && !receiptMessage && (
        <p className="text-sm text-slate-500">
          O comprovante desta transferência ainda não está disponível.
        </p>
      )}
    </div>
  )
}
