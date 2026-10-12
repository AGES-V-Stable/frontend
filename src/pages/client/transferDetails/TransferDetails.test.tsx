import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/routes/paths'
import {
  downloadTransferReceipt,
  getTransferDetails,
  saveReceipt,
  TransferDetailsError,
} from '@/services/transferDetails'
import type { TransferDetails as TransferDetailsData } from '@/types/transferDetails'

import { TransferDetails } from './TransferDetails'

vi.mock('@/services/transferDetails', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/transferDetails')>()
  return {
    ...actual,
    getTransferDetails: vi.fn(),
    downloadTransferReceipt: vi.fn(),
    saveReceipt: vi.fn(),
  }
})

const ID = '17f2df21-32ed-45b2-b1cc-83146bb39cbb'

const details: TransferDetailsData = {
  id: ID,
  companyId: 'a0e05887-ddf7-46a4-89ab-84238ed0e6de',
  date: '2026-10-02T19:23:08.95879Z',
  type: 'PAGAMENTO',
  status: 'SETTLED',
  counterpartyName: 'Atlas Imports LLC',
  counterpartyDetails: 'Atlas',
  source: { amount: '125000.00', currency: 'BRL' },
  destination: { amount: '23062.73', currency: 'USD' },
  fundingSource: 'ACCOUNT_BALANCE',
  exchangeRate: { fromCurrency: 'USD', toCurrency: 'BRL', rate: '5.42' },
  costs: {
    serviceFee: { amount: '562.50', currency: 'BRL', percentage: '0.45' },
    spreadPercentage: null,
    estimatedMarketCost: null,
  },
  estimatedSavings: null,
  receiptAvailable: true,
}

/** O Intl separa símbolo e valor com espaço não separável. */
const text = (value: string | null) => (value ?? '').replace(/\s/g, ' ')

function renderPage(initialPath = `/transferencias/${ID}`) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Link to="/transferencias/outra">trocar</Link>
      <Routes>
        <Route path="/transferencias/:id" element={<TransferDetails />} />
        <Route path={PATHS.TRANSFERS} element={<p>Formulário de nova transferência</p>} />
        <Route path={PATHS.LOGIN} element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const dialog = () => screen.getByRole('dialog')

describe('TransferDetails', () => {
  beforeEach(() => {
    vi.mocked(getTransferDetails).mockResolvedValue(details)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('asks for the transfer in the route and shows a loading state first', async () => {
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando detalhes...')
    expect(getTransferDetails).toHaveBeenCalledWith(ID, expect.any(AbortSignal))
    expect(await screen.findByText('Atlas Imports LLC')).toBeInTheDocument()
  })

  it('shows the recorded values only formatted', async () => {
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    const panel = dialog()
    expect(panel).toHaveTextContent('Detalhes da transferência')
    expect(panel).toHaveTextContent('Concluída')
    expect(panel).toHaveTextContent(ID)
    expect(text(panel.textContent)).toContain('02 out 2026 • 16:23')
    expect(panel).toHaveTextContent('Pagamento internacional')
    expect(text(panel.textContent)).toContain('R$ 125.000,00')
    expect(text(panel.textContent)).toContain('US$ 23.062,73')
    expect(panel).toHaveTextContent('Saldo V-Stable')
    expect(text(panel.textContent)).toContain('1 USD = R$ 5,42')
    expect(text(panel.textContent)).toContain('0,45% • R$ 562,50')
    expect(panel).toHaveTextContent('Beneficiário')
  })

  it('does not show market comparison or savings when they are unavailable', async () => {
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    expect(screen.queryByText('Mercado estimado')).not.toBeInTheDocument()
    expect(screen.queryByText(/economia estimada/i)).not.toBeInTheDocument()
  })

  it('shows market comparison and savings when the backend provides them', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({
      ...details,
      costs: {
        serviceFee: details.costs.serviceFee,
        spreadPercentage: null,
        estimatedMarketCost: { amount: '1375.00', currency: 'BRL', percentage: '1.10' },
      },
      estimatedSavings: { amount: '812.50', currency: 'BRL' },
    })
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    expect(text(dialog().textContent)).toContain('1,10% • R$ 1.375,00')
    expect(text(dialog().textContent)).toContain('Economia estimada de R$ 812,50')
  })

  it('treats null as unavailable and a known zero as a value', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({
      ...details,
      type: null,
      status: 'ALGO_NOVO',
      counterpartyName: null,
      counterpartyDetails: null,
      source: { amount: null, currency: 'BRL' },
      fundingSource: null,
      exchangeRate: null,
      costs: {
        serviceFee: { amount: '0.00', currency: 'BRL', percentage: '0.00' },
        spreadPercentage: null,
        estimatedMarketCost: null,
      },
    })
    renderPage()
    await screen.findByText('Status indisponível')

    const panel = dialog()
    expect(panel.textContent?.match(/Indisponível/g)?.length).toBeGreaterThanOrEqual(4)
    expect(text(panel.textContent)).toContain('0,00% • R$ 0,00')
    expect(screen.queryByText('Cotação aplicada')).not.toBeInTheDocument()
  })

  it('keeps unknown codes neutral and shows an unknown funding source as received', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({
      ...details,
      type: 'constructor',
      status: 'toString',
      fundingSource: 'CARTAO',
    })
    renderPage()
    await screen.findByText('Status indisponível')

    const panel = dialog()
    expect(panel).toHaveTextContent('CARTAO')
    expect(panel).not.toHaveTextContent('Pagamento internacional')
    expect(panel).not.toHaveTextContent('Concluída')
  })

  it('says the cost block is unavailable when nothing was recorded', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({
      ...details,
      exchangeRate: null,
      costs: { serviceFee: null, spreadPercentage: null, estimatedMarketCost: null },
    })
    renderPage()

    expect(
      await screen.findByText('Informações de cotação e custos indisponíveis.'),
    ).toBeInTheDocument()
  })

  it('labels the counterparty as payer on a receipt transfer', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({ ...details, type: 'RECEBIMENTO' })
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    expect(dialog()).toHaveTextContent('Pagador')
    expect(dialog()).toHaveTextContent('Recebimento internacional')
  })

  it('renders Compartilhar without any action', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.click(screen.getByRole('button', { name: 'Compartilhar' }))

    expect(downloadTransferReceipt).not.toHaveBeenCalled()
    expect(saveReceipt).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('downloads the receipt and blocks a second click while it runs', async () => {
    const user = userEvent.setup()
    let finish: (file: { blob: Blob; fileName: string }) => void = () => {}
    vi.mocked(downloadTransferReceipt).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.click(screen.getByRole('button', { name: 'Baixar comprovante' }))
    const busy = await screen.findByRole('button', { name: 'Baixando...' })
    expect(busy).toBeDisabled()
    await user.click(busy)

    expect(downloadTransferReceipt).toHaveBeenCalledTimes(1)
    expect(downloadTransferReceipt).toHaveBeenCalledWith(ID)

    const file = { blob: new Blob(['%PDF']), fileName: 'comprovante-transferencia.pdf' }
    await act(async () => finish(file))

    expect(saveReceipt).toHaveBeenCalledWith(file)
    expect(await screen.findByRole('button', { name: 'Baixar comprovante' })).toBeEnabled()
  })

  it('disables the receipt action when the transfer has no receipt', async () => {
    vi.mocked(getTransferDetails).mockResolvedValue({ ...details, receiptAvailable: false })
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    expect(screen.getByRole('button', { name: 'Baixar comprovante' })).toBeDisabled()
    expect(
      screen.getByText('O comprovante desta transferência ainda não está disponível.'),
    ).toBeInTheDocument()
  })

  it('updates the action when the receipt becomes unavailable between details and download', async () => {
    const user = userEvent.setup()
    vi.mocked(downloadTransferReceipt).mockRejectedValue(
      new TransferDetailsError(409, 'RECEIPT_UNAVAILABLE', 'indisponível'),
    )
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.click(screen.getByRole('button', { name: 'Baixar comprovante' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O comprovante desta transferência ainda não está disponível.',
    )
    expect(screen.getByRole('button', { name: 'Baixar comprovante' })).toBeDisabled()
    expect(saveReceipt).not.toHaveBeenCalled()
  })

  it('keeps the download available for another try after a transient failure', async () => {
    const user = userEvent.setup()
    vi.mocked(downloadTransferReceipt).mockRejectedValue(
      new TransferDetailsError(502, 'RECEIPT_PROVIDER_ERROR', 'falhou'),
    )
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.click(screen.getByRole('button', { name: 'Baixar comprovante' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente')
    expect(screen.getByRole('button', { name: 'Baixar comprovante' })).toBeEnabled()
  })

  it.each([
    ['TRANSFER_NOT_FOUND', 404, 'Transferência não encontrada.'],
    ['INVALID_TRANSFER_ID', 400, 'O identificador da transferência é inválido.'],
    ['USER_NOT_VERIFIED', 403, 'concluir a verificação'],
    ['COMPANY_ACCESS_REQUIRED', 403, 'não possui acesso a uma empresa'],
  ] as const)('shows %s without data from a previous transfer', async (code, status, message) => {
    vi.mocked(getTransferDetails).mockRejectedValue(new TransferDetailsError(status, code, 'x'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Atlas Imports LLC')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar comprovante' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('sends an expired session to the login', async () => {
    const user = userEvent.setup()
    vi.mocked(getTransferDetails).mockRejectedValue(
      new TransferDetailsError(401, 'UNAUTHENTICATED', 'x'),
    )
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou')
    await user.click(screen.getByRole('button', { name: 'Ir para o login' }))

    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })

  it('retries after a transient failure', async () => {
    const user = userEvent.setup()
    vi.mocked(getTransferDetails)
      .mockRejectedValueOnce(new TransferDetailsError(null, 'NETWORK_ERROR', 'x'))
      .mockResolvedValueOnce(details)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Atlas Imports LLC')).toBeInTheDocument()
    expect(getTransferDetails).toHaveBeenCalledTimes(2)
  })

  it('never shows a late response of another transfer', async () => {
    const user = userEvent.setup()
    let resolveFirst: (value: TransferDetailsData) => void = () => {}
    vi.mocked(getTransferDetails)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce({ ...details, id: 'outra', counterpartyName: 'Segunda Empresa' })
    renderPage('/transferencias/primeira')

    await user.click(screen.getByRole('link', { name: 'trocar' }))
    expect(await screen.findByText('Segunda Empresa')).toBeInTheDocument()

    await act(async () =>
      resolveFirst({ ...details, id: 'primeira', counterpartyName: 'Primeira Empresa' }),
    )

    expect(screen.queryByText('Primeira Empresa')).not.toBeInTheDocument()
    expect(screen.getByText('Segunda Empresa')).toBeInTheDocument()
  })

  it('clears the previous transfer while the next one loads', async () => {
    const user = userEvent.setup()
    vi.mocked(getTransferDetails)
      .mockResolvedValueOnce({ ...details, counterpartyName: 'Primeira Empresa' })
      .mockImplementationOnce(() => new Promise(() => {}))
    renderPage('/transferencias/primeira')
    await screen.findByText('Primeira Empresa')

    await user.click(screen.getByRole('link', { name: 'trocar' }))

    await waitFor(() => expect(screen.queryByText('Primeira Empresa')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando detalhes...')
  })

  it('closes with the button and with Escape, going back to the transfer screen', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(await screen.findByText('Formulário de nova transferência')).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Atlas Imports LLC')

    await user.keyboard('{Escape}')

    expect(await screen.findByText('Formulário de nova transferência')).toBeInTheDocument()
  })
})
