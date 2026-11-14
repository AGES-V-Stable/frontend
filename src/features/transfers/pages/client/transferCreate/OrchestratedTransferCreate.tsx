import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/features/auth'
import { getCompanyBeneficiaries } from '@/features/beneficiaries'
import type { Beneficiary } from '@/features/beneficiaries'
import { OrchestratedOfferConfirmation } from '@/features/transfers/components/OrchestratedOfferConfirmation/OrchestratedOfferConfirmation'
import { requestOrchestratedQuote } from '@/features/transfers/api/orchestratedTransfers'
import type { OrchestratedQuoteResponse } from '@/features/transfers/api/orchestratedTransfers'
import { Button } from '@/shared/components/Button'
import { formatMoney, parseDecimalInput } from '@/shared/utils/formatters'

type BeneficiaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: Beneficiary[] }

const TOKENS = ['USDC', 'USDT'] as const
const NETWORKS = ['polygon', 'ethereum', 'base'] as const
const FIELD_CLASS =
  'w-full rounded-lg border border-sage-300 bg-white px-3 py-3 text-sm text-slate-900'

/** The backend uses an explicit, supported payment rail for bank beneficiaries. */
function routeFor(beneficiary: Beneficiary) {
  if (beneficiary.receivingMethod === 'BANK_ACCOUNT' && beneficiary.currency) {
    return {
      targetPaymentMethod: 'international_swift',
      targetCurrency: beneficiary.currency.toUpperCase(),
      bank: true,
    }
  }
  if (beneficiary.receivingMethod === 'CRYPTO_WALLET' && beneficiary.currency) {
    return {
      targetPaymentMethod: beneficiary.blockchainNetwork?.toLowerCase() ?? 'blockchain',
      targetCurrency: beneficiary.currency.toUpperCase(),
      bank: false,
    }
  }
  return null
}

/**
 * Financial operations are visible only behind the environment rollout flag in
 * TransferCreate. Quotes do not create tickets: the explicit TOTP confirmation does.
 */
export function OrchestratedTransferCreate() {
  const { user } = useSession()
  const companyId = user?.companyId
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryState>({ status: 'loading' })
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [amountText, setAmountText] = useState('')
  const [amountSide, setAmountSide] = useState<'SOURCE' | 'TARGET'>('SOURCE')
  const [token, setToken] = useState<(typeof TOKENS)[number]>('USDC')
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>('polygon')
  const [description, setDescription] = useState('')
  const [quote, setQuote] = useState<OrchestratedQuoteResponse | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const quoteRequest = useRef<AbortController | null>(null)
  const generation = useRef(0)

  useEffect(() => {
    if (!companyId) {
      return
    }
    const controller = new AbortController()
    getCompanyBeneficiaries(companyId, { size: 100 }, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setBeneficiaries({ status: 'ready', items: page.content })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setBeneficiaries({ status: 'error' })
      })
    return () => controller.abort()
  }, [companyId])

  useEffect(
    () => () => {
      generation.current += 1
      quoteRequest.current?.abort()
    },
    [],
  )

  function invalidateQuote() {
    generation.current += 1
    quoteRequest.current?.abort()
    quoteRequest.current = null
    setQuote(null)
    setQuoteError(null)
    setLoadingQuote(false)
  }

  const beneficiary =
    beneficiaries.status === 'ready'
      ? beneficiaries.items.find((item) => item.id === beneficiaryId)
      : undefined
  const route = beneficiary ? routeFor(beneficiary) : null
  const amount = parseDecimalInput(amountText)
  const validAmount = amount !== null && Number.isFinite(amount) && amount >= 0.01
  const canQuote = Boolean(companyId && route && validAmount && !loadingQuote)

  async function requestQuote() {
    if (!canQuote || !route || !amount || !beneficiary) return
    invalidateQuote()
    const controller = new AbortController()
    quoteRequest.current = controller
    const currentGeneration = generation.current
    setLoadingQuote(true)
    try {
      const result = await requestOrchestratedQuote(
        {
          beneficiaryId: beneficiary.id,
          direction: 'PAYOUT',
          sourceCurrency: 'BRL',
          targetCurrency: route.targetCurrency,
          sourcePaymentMethod: 'pix',
          targetPaymentMethod: route.targetPaymentMethod,
          amount,
          amountSide,
          ...(route.bank ? { token, blockchainNetwork: network } : {}),
          coverFees: amountSide === 'TARGET',
          ...(description.trim() ? { description: description.trim() } : {}),
        },
        controller.signal,
      )
      if (controller.signal.aborted || generation.current !== currentGeneration) return
      setQuote(result)
    } catch {
      if (controller.signal.aborted || generation.current !== currentGeneration) return
      setQuoteError(
        'Não foi possível obter uma oferta válida. Confira os dados e solicite outra cotação.',
      )
    } finally {
      if (generation.current === currentGeneration) {
        quoteRequest.current = null
        setLoadingQuote(false)
      }
    }
  }

  if (!companyId) {
    return (
      <p role="alert">É necessário ter um vínculo empresarial ativo para cotar transferências.</p>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 md:px-10">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Cotação e transferência</h1>
        <p className="text-sm text-slate-600">
          Compare as ofertas disponíveis. Uma operação só será iniciada após sua autorização por
          TOTP.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Dados da cotação</h2>
        <label htmlFor="orchestrated-beneficiary" className="text-sm font-medium text-slate-900">
          Beneficiário
        </label>
        <select
          id="orchestrated-beneficiary"
          className={FIELD_CLASS}
          value={beneficiaryId}
          disabled={loadingQuote || beneficiaries.status !== 'ready'}
          onChange={(event) => {
            invalidateQuote()
            setBeneficiaryId(event.target.value)
          }}
        >
          <option value="">Selecione o beneficiário</option>
          {beneficiaries.status === 'ready' &&
            beneficiaries.items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.legalName || item.nickname}
              </option>
            ))}
        </select>
        {beneficiaries.status === 'loading' && <p role="status">Carregando beneficiários...</p>}
        {beneficiaries.status === 'error' && (
          <p role="alert">Não foi possível carregar os beneficiários.</p>
        )}
        {beneficiary && !route && (
          <p role="alert">
            Este beneficiário não possui uma rota de pagamento compatível para cotação.
          </p>
        )}
        {route && (
          <p className="text-sm text-slate-600">
            Origem: BRL via PIX. Destino: {route.targetCurrency} (
            {route.bank ? 'conta bancária' : 'carteira cripto'}).
          </p>
        )}

        <label htmlFor="orchestrated-side" className="text-sm font-medium text-slate-900">
          Valor informado em
        </label>
        <select
          id="orchestrated-side"
          className={FIELD_CLASS}
          value={amountSide}
          onChange={(event) => {
            invalidateQuote()
            setAmountSide(event.target.value as 'SOURCE' | 'TARGET')
          }}
        >
          <option value="SOURCE">BRL (valor de origem)</option>
          <option value="TARGET">
            {route?.targetCurrency ?? 'Moeda de destino'} (valor de destino)
          </option>
        </select>

        <label htmlFor="orchestrated-amount" className="text-sm font-medium text-slate-900">
          Valor
        </label>
        <input
          id="orchestrated-amount"
          inputMode="decimal"
          className={FIELD_CLASS}
          placeholder="1.000,00"
          value={amountText}
          onChange={(event) => {
            invalidateQuote()
            setAmountText(event.target.value)
          }}
        />
        {amountText.trim() && !validAmount && (
          <p role="alert" className="text-sm text-red-700">
            Informe um valor positivo com até duas casas decimais.
          </p>
        )}

        {route?.bank && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="orchestrated-token" className="text-sm font-medium text-slate-900">
                Token intermediário
              </label>
              <select
                id="orchestrated-token"
                className={FIELD_CLASS}
                value={token}
                onChange={(e) => {
                  invalidateQuote()
                  setToken(e.target.value as typeof token)
                }}
              >
                {TOKENS.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="orchestrated-network" className="text-sm font-medium text-slate-900">
                Rede
              </label>
              <select
                id="orchestrated-network"
                className={FIELD_CLASS}
                value={network}
                onChange={(e) => {
                  invalidateQuote()
                  setNetwork(e.target.value as typeof network)
                }}
              >
                {NETWORKS.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <label htmlFor="orchestrated-description" className="text-sm font-medium text-slate-900">
          Descrição (opcional)
        </label>
        <input
          id="orchestrated-description"
          className={FIELD_CLASS}
          maxLength={128}
          value={description}
          onChange={(e) => {
            invalidateQuote()
            setDescription(e.target.value)
          }}
        />
        <Button
          type="button"
          label={loadingQuote ? 'Consultando...' : 'Consultar melhor oferta'}
          disabled={!canQuote}
          onClick={() => void requestQuote()}
        />
        {quoteError && (
          <p role="alert" className="text-sm text-red-700">{quoteError}</p>
        )}
      </section>

      {quote && (
        <section className="flex flex-col gap-4" aria-label="Oferta selecionada">
          <div className="rounded-xl border border-sage-300 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Melhor oferta encontrada</h2>
            <p className="text-sm text-slate-600">Provedor: {quote.offer.provider}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt>Valor de origem</dt>
                <dd className="font-semibold">{formatMoney(quote.offer.sourceAmount, 'BRL')}</dd>
              </div>
              <div>
                <dt>Valor de destino</dt>
                <dd className="font-semibold">
                  {formatMoney(quote.offer.targetAmount, route?.targetCurrency ?? 'USD')}
                </dd>
              </div>
              <div>
                <dt>Taxas informadas pelo provedor (moeda não especificada)</dt>
                <dd className="font-semibold">{quote.offer.totalFee}</dd>
              </div>
              <div>
                <dt>Expira em</dt>
                <dd>{new Date(quote.offer.expiresAt).toLocaleString('pt-BR')}</dd>
              </div>
            </dl>
          </div>
          <OrchestratedOfferConfirmation key={quote.offer.offerId} offer={quote.offer} />
        </section>
      )}
    </main>
  )
}
