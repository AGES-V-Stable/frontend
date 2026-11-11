import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { ActionIcon } from '@/shared/components/Icons/ActionIcon'
import { Stepper } from '@/shared/components/Stepper'
import type { Beneficiary } from '@/features/beneficiaries'
import type {
  FundingMethod,
  QuoteOffer,
  TransferExecution,
  TransferExecutionStatus,
} from '@/features/transfers/types/transfer'
import { currencySymbol, formatMoney } from '@/shared/utils/formatters'
import { useTransferCreate } from '@/features/transfers/hooks/useTransferCreate'

const TRANSFER_STEPS = ['Dados', 'Revisão', 'Pagamento'] as const

// Mesmo visual do Input para os campos nativos (select e textarea) da tela.
const FIELD_CLASS =
  'w-full rounded-lg border border-sage-300 bg-surface px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const SOURCE_CURRENCY = 'BRL'

const PAYMENT_METHODS: { value: FundingMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'TED', label: 'TED' },
]

const EXECUTION_STATUS: Record<TransferExecutionStatus, string> = {
  PENDING_SUBMISSION: 'Enviando ao provedor...',
  AWAITING_FUNDS: 'Aguardando o seu pagamento',
  FUNDS_RECEIVED: 'Pagamento recebido. Preparando o envio ao beneficiário...',
  REQUOTE_REQUIRED: 'A cotação mudou durante o pagamento e precisa ser confirmada de novo',
  PAYOUT_SUBMITTING: 'Enviando ao beneficiário...',
  PAYOUT_PROCESSING: 'Envio em processamento',
  SUBMITTED: 'Transferência enviada ao provedor',
  COMPLETED: 'Transferência concluída',
  FAILED: 'A transferência falhou',
  REFUNDED: 'A transferência foi estornada',
  RECONCILIATION_REQUIRED: 'Em análise pela equipe V-Stable. Não repita a transferência.',
}

const PROVIDER_LABELS: Record<string, string> = { BLINDPAY: 'BlindPay', AVENIA: 'Avenia' }

/** O backend cota em todos os provedores elegíveis e devolve só a oferta mais vantajosa. */
const providerName = (provider: string) => PROVIDER_LABELS[provider] ?? provider

const beneficiaryName = (beneficiary: Beneficiary) => beneficiary.legalName || beneficiary.nickname

const formatTime = (isoDate: string) => new Date(isoDate).toLocaleTimeString('pt-BR')

/** Câmbio efetivo: quanto chega por real pago, já com as taxas dos provedores. */
const effectiveRate = (offer: QuoteOffer, targetCurrency: string) =>
  `1 ${SOURCE_CURRENCY} = ${formatMoney(offer.exchangeRate, targetCurrency)}`

function OfferValues({ offer, targetCurrency }: { offer: QuoteOffer; targetCurrency: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-slate-500">Melhor oferta</dt>
        <dd className="font-medium text-slate-900">{providerName(offer.provider)}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-slate-500">Você paga</dt>
        <dd className="font-bold text-slate-900">
          {formatMoney(offer.sourceAmount, SOURCE_CURRENCY)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-slate-500">Beneficiário recebe</dt>
        <dd className="font-bold text-slate-900">
          {formatMoney(offer.targetAmount, targetCurrency)}
        </dd>
      </div>
      {offer.expiresAt && (
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">Válida até</dt>
          <dd className="font-medium text-slate-900">{formatTime(offer.expiresAt)}</dd>
        </div>
      )}
    </>
  )
}

interface ExecutionPanelProps {
  execution: TransferExecution
  pollError: boolean
  submitting: boolean
  submitError?: string
  onConfirmRequote: () => void
  onNewTransfer: () => void
}

function ExecutionPanel({
  execution,
  pollError,
  submitting,
  submitError,
  onConfirmRequote,
  onNewTransfer,
}: ExecutionPanelProps) {
  const done = ['COMPLETED', 'FAILED', 'REFUNDED', 'RECONCILIATION_REQUIRED'].includes(
    execution.status,
  )
  return (
    <section className="flex flex-col gap-6 rounded-xl border border-sage-300 bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-900">Pagamento da transferência</h2>
        <p role="status" className="text-base font-medium text-slate-900">
          {EXECUTION_STATUS[execution.status]}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase text-slate-500">Você paga</dt>
          <dd className="text-base font-semibold text-slate-900">
            {formatMoney(execution.source.amount, execution.source.currency)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase text-slate-500">Beneficiário recebe</dt>
          <dd className="text-base font-semibold text-slate-900">
            {formatMoney(execution.target.amount, execution.target.currency)}
          </dd>
        </div>
      </dl>

      {execution.status === 'AWAITING_FUNDS' && execution.fundingInstructions && (
        <div className="flex flex-col gap-2">
          <label htmlFor="transfer-funding" className="text-[14px] text-sage-800">
            Código PIX para pagamento (copia e cola)
          </label>
          <textarea
            id="transfer-funding"
            readOnly
            value={execution.fundingInstructions}
            className={`${FIELD_CLASS} h-24 resize-none py-3 font-mono text-xs`}
          />
          <p className="text-xs text-slate-500">
            Pague o valor exato. O status é atualizado automaticamente após a confirmação.
          </p>
        </div>
      )}

      {execution.status === 'REQUOTE_REQUIRED' && execution.requote && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Nova cotação: você paga{' '}
            <strong>
              {formatMoney(execution.requote.source.amount, execution.requote.source.currency)}
            </strong>{' '}
            e o beneficiário recebe{' '}
            <strong>
              {formatMoney(execution.requote.target.amount, execution.requote.target.currency)}
            </strong>
            {execution.requote.expiresAt &&
              `, válida até ${formatTime(execution.requote.expiresAt)}`}
            .
          </p>
          <div className="w-full sm:w-[240px]">
            <Button
              type="button"
              label={submitting ? 'Confirmando...' : 'Aceitar nova cotação'}
              onClick={onConfirmRequote}
              disabled={submitting}
              className="h-12 font-medium"
            />
          </div>
        </div>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}
      {pollError && (
        <p role="alert" className="text-sm text-amber-800">
          Não foi possível atualizar o status agora. Tentaremos novamente em instantes.
        </p>
      )}

      {done && (
        <div className="w-full sm:w-[240px]">
          <Button
            type="button"
            variant="secondary"
            label="Nova transferência"
            onClick={onNewTransfer}
            className="h-12 font-medium"
          />
        </div>
      )}
    </section>
  )
}

export function TransferCreate() {
  const {
    activeStep,
    selectedBeneficiary,
    beneficiaryMissingData,
    values,
    amountType,
    quoteState,
    beneficiaries,
    submitting,
    submitError,
    execution,
    pollError,
    beneficiaryList,
    destinationCurrency,
    canContinue,
    amountError,
    quote,
    isWithdrawalLocked,
    withdrawalLockedUntil,
    handleAmountChange,
    handleBeneficiaryChange,
    handlePaymentMethodChange,
    handleDescriptionChange,
    handleRetryQuote,
    handleCancel,
    handleNextStep,
    handlePreviousStep,
    handleConfirm,
    handleConfirmRequote,
  } = useTransferCreate()

  const quoteAside = (
    <aside
      aria-labelledby="transfer-quote-title"
      className="flex flex-col gap-4 rounded-xl border border-sage-300 bg-white p-6"
    >
      <h2 id="transfer-quote-title" className="text-sm font-bold text-slate-900">
        Cotação
      </h2>

      {quoteState.status === 'loading' && (
        <p role="status" className="text-sm text-slate-500">
          Atualizando cotação...
        </p>
      )}
      {quoteState.status === 'idle' &&
        (beneficiaryMissingData ? (
          <p role="alert" className="text-sm text-red-700">
            Este beneficiário não tem moeda ou trilho de recebimento cadastrado. Atualize o cadastro
            para transferir.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Selecione o beneficiário e informe um valor para consultar a cotação.
          </p>
        ))}
      {(quoteState.status === 'error' || quoteState.status === 'expired') && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-red-700">
            {quoteState.status === 'error'
              ? quoteState.message
              : 'A cotação expirou. Atualize para ver os valores atuais.'}
          </p>
          <div>
            <Button
              type="button"
              variant="tertiary"
              label={quoteState.status === 'error' ? 'Tentar novamente' : 'Atualizar cotação'}
              onClick={handleRetryQuote}
            />
          </div>
        </div>
      )}

      <dl className="flex flex-col gap-3 text-sm tabular-nums">
        <div className="flex w-fit flex-col gap-1 rounded-lg bg-blue-50 p-4">
          <dt className="text-sm uppercase text-slate-500">Câmbio efetivo</dt>
          <dd className="text-base font-medium text-slate-900">
            {quote ? effectiveRate(quote.offer, destinationCurrency) : '—'}
          </dd>
        </div>
        {quote && <OfferValues offer={quote.offer} targetCurrency={destinationCurrency} />}
      </dl>
      <p className="text-xs text-slate-500">O câmbio efetivo já inclui as taxas dos provedores.</p>
    </aside>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1684px] flex-col gap-6 px-4 py-8 md:px-12">
      <header className="flex flex-col">
        <h1 className="text-xl font-bold text-slate-900">Realizar transferência</h1>
        <p className="text-xs text-slate-500">Informe os dados do pagamento internacional.</p>
      </header>

      {isWithdrawalLocked && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-950 font-bold text-sm"
              aria-hidden="true"
            >
              !
            </span>
            <div>
              <p className="font-semibold text-amber-950">
                Transferências temporariamente bloqueadas
              </p>
              <p className="text-sm text-amber-900">
                Por medidas de segurança, transferências estão temporariamente bloqueadas por 48
                horas devido à redefinição recente do seu 2FA.
              </p>
            </div>
          </div>
          {withdrawalLockedUntil && (
            <div className="text-xs font-medium text-amber-800 md:text-right">
              Bloqueio ativo até:{' '}
              <span className="font-bold">
                {new Date(withdrawalLockedUntil).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      )}

      <Stepper steps={TRANSFER_STEPS} activeStep={activeStep} className="max-w-[1038px]" />

      {submitError && activeStep !== 2 && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      {/* PASSO 0: DADOS DA TRANSFERÊNCIA */}
      {activeStep === 0 && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            handleNextStep()
          }}
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
                  handlePaymentMethodChange(
                    PAYMENT_METHODS.find((method) => method.value === event.target.value)?.value ??
                      '',
                  )
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
                <p role="alert" className="text-sm text-red-700">
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
                maxLength={128}
                value={values.description}
                disabled={submitting}
                onChange={(event) => handleDescriptionChange(event.target.value)}
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
                  label="Continuar"
                  disabled={!canContinue}
                  className="h-12 font-medium"
                />
              </div>
            </div>
          </section>

          {quoteAside}
        </form>
      )}

      {/* PASSO 1: REVISÃO DA TRANSFERÊNCIA */}
      {activeStep === 1 && quote && (
        <div className="mx-auto w-full max-w-[1038px]">
          <section className="flex flex-col gap-6 rounded-xl border border-sage-300 bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-slate-900">Revisão da transferência</h2>
              <p className="text-xs text-slate-500">
                Confira os valores. Ao confirmar, a transferência é executada exatamente com esta
                cotação.
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Método de Pagamento
                </dt>
                <dd className="text-sm font-medium text-slate-900">{values.paymentMethod}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">Beneficiário</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {selectedBeneficiary ? beneficiaryName(selectedBeneficiary) : '—'}
                </dd>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">Você paga</dt>
                <dd className="text-base font-semibold text-slate-900">
                  {formatMoney(quote.offer.sourceAmount, SOURCE_CURRENCY)}
                </dd>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Beneficiário recebe
                </dt>
                <dd className="text-base font-semibold text-slate-900">
                  {formatMoney(quote.offer.targetAmount, destinationCurrency)}
                </dd>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">Melhor oferta</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {providerName(quote.offer.provider)}
                </dd>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase text-slate-500">Câmbio efetivo</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {effectiveRate(quote.offer, destinationCurrency)}
                </dd>
              </div>
              {quote.offer.expiresAt && (
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Cotação válida até
                  </dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {formatTime(quote.offer.expiresAt)}
                  </dd>
                </div>
              )}
              {values.description.trim() && (
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4 md:col-span-2">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Descrição</dt>
                  <dd className="text-sm text-slate-700">{values.description.trim()}</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <div className="w-full sm:w-[200px]">
                <Button
                  type="button"
                  variant="secondary"
                  label="Voltar"
                  onClick={handlePreviousStep}
                  disabled={submitting}
                  className="h-12 font-medium"
                />
              </div>
              <div className="w-full sm:w-[240px]">
                <Button
                  type="button"
                  variant="primary"
                  label={submitting ? 'Confirmando...' : 'Confirmar transferência'}
                  onClick={handleConfirm}
                  disabled={submitting || isWithdrawalLocked}
                  className="h-12 font-medium"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* PASSO 2: PAGAMENTO E ACOMPANHAMENTO */}
      {activeStep === 2 && execution && (
        <div className="mx-auto w-full max-w-[1038px]">
          <ExecutionPanel
            execution={execution}
            pollError={pollError}
            submitting={submitting}
            submitError={submitError}
            onConfirmRequote={handleConfirmRequote}
            onNewTransfer={handleCancel}
          />
        </div>
      )}
    </div>
  )
}
