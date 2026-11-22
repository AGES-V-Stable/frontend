import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/auth'
import { createBeneficiary } from '@/features/beneficiaries/api/beneficiary'
import { BeneficiaryCreate } from '@/features/beneficiaries/pages/client/beneficiaryCreate/BeneficiaryCreate'
import { PATHS } from '@/shared/navigation/paths'

vi.mock('@/features/auth', () => ({
  useSession: vi.fn(),
}))
vi.mock('@/features/beneficiaries/api/beneficiary', () => ({
  createBeneficiary: vi.fn(),
}))

const currentUser = {
  id: 'user-1',
  name: 'Marina Costa',
  email: 'marina@vstable.com',
  companyId: 'company-1',
}

async function fillIdentification(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Razão social / Nome completo *'),
    'Fornecedor Global Ltda.',
  )
  await user.type(screen.getByLabelText('Documento fiscal *'), '12345678900')
  await user.type(screen.getByLabelText('País *'), 'Brasil')
  await user.type(screen.getByLabelText('Endereço *'), 'Av. Paulista, 1000')
}

async function fillBankFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('País do beneficiário (código de 2 letras) *'), 'br')
  await user.type(screen.getByLabelText('País do banco (código de 2 letras) *'), 'us')
  await user.type(screen.getByLabelText('Cidade do beneficiário *'), 'São Paulo')
  await user.type(screen.getByLabelText('Banco *'), 'Banco XYZ')
  await user.type(screen.getByLabelText('SWIFT / BIC *'), 'BOFAUS3N')
  await user.type(
    screen.getByLabelText('IBAN / número da conta *'),
    'BR1800000000141455970000123456',
  )
  await user.type(screen.getByLabelText('Moeda de recebimento *'), 'USD')
  await user.type(screen.getByLabelText('Apelido do beneficiário *'), 'Fornecedor principal')
}

async function waitForCompanyLoaded() {
  await waitFor(() => expect(useSession).toHaveBeenCalled())
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={[PATHS.BENEFICIARIES_NEW]}>
      <Routes>
        <Route path={PATHS.BENEFICIARIES_NEW} element={<BeneficiaryCreate />} />
        <Route path={PATHS.BENEFICIARIES} element={<p>Lista de beneficiários</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BeneficiaryCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      user: { ...currentUser, accountType: 'USER', roles: ['ROLE_USER'] },
      company: null,
      error: null,
      retry: vi.fn(),
    })
    vi.mocked(createBeneficiary).mockResolvedValue({ id: 'beneficiary-1' })
  })

  it('stacks Identificação above Dados de recebimento, with the long fields taking a whole row', async () => {
    // Given o formulário de cadastro
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    // Then as duas seções aparecem em ordem, e os campos longos ocupam a linha inteira da grade
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Identificação', 'Dados de recebimento'])
    const fullRow = (label: string) => screen.getByLabelText(label).closest('.md\\:col-span-2')
    expect(fullRow('Endereço *')).not.toBeNull()
    expect(fullRow('IBAN / número da conta *')).not.toBeNull()
    expect(fullRow('Banco *')).toBeNull()

    // When o usuário troca para wallet
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))

    // Then o endereço da wallet ocupa a linha inteira e os selects usam a borda dos outros campos
    expect(fullRow('Endereço da wallet *')).not.toBeNull()
    expect(screen.getByLabelText('Rede blockchain *')).toHaveClass('border-sage-500')
    expect(screen.getByLabelText('Tipo de beneficiário *')).toHaveClass('border-sage-500')
  })

  it('shows the bank account fields by default and switches to wallet fields on toggle', async () => {
    const user = userEvent.setup()
    renderCreate()

    expect(screen.getByRole('tab', { name: 'Conta bancária' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Banco *')).toBeInTheDocument()
    expect(screen.queryByLabelText('Endereço da wallet *')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))

    expect(screen.getByLabelText('Endereço da wallet *')).toBeInTheDocument()
    expect(screen.getByLabelText('Rede blockchain *')).toBeInTheDocument()
    expect(screen.queryByLabelText('Banco *')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Conta bancária' }))
    expect(screen.getByLabelText('Banco *')).toBeInTheDocument()
  })

  it('preserves values typed in the inactive group when toggling', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(screen.getByLabelText('Banco *'), 'Banco XYZ')
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.type(screen.getByLabelText('Endereço da wallet *'), '0xabc')
    await user.click(screen.getByRole('tab', { name: 'Conta bancária' }))

    expect(screen.getByLabelText('Banco *')).toHaveValue('Banco XYZ')
  })

  it('blocks submit and shows required-field errors when the form is empty', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findAllByText('Campo obrigatório.')).not.toHaveLength(0)
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('flags the blockchain network field when the wallet form is submitted empty', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findAllByText('Campo obrigatório.')).not.toHaveLength(0)
    expect(screen.getByLabelText('Rede blockchain *')).toHaveAttribute('aria-invalid', 'true')
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('blocks submit when the confirmation checkbox is not checked', async () => {
    const user = userEvent.setup()
    renderCreate()

    await fillIdentification(user)
    await fillBankFields(user)

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findByText('Confirme a revisão dos dados.')).toBeInTheDocument()
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('submits a bank account beneficiary and shows the success banner', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await fillBankFields(user)
    await user.click(screen.getByLabelText(/confirmo que os dados/i))

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith('company-1', {
        beneficiaryType: 'LEGAL_ENTITY',
        legalName: 'Fornecedor Global Ltda.',
        identificationDocument: '12345678900',
        country: 'Brasil',
        address: 'Av. Paulista, 1000',
        confirmed: true,
        receivingMethod: 'BANK_ACCOUNT',
        paymentRail: 'international_swift',
        addressLine1: 'Av. Paulista, 1000',
        city: 'São Paulo',
        countryCode: 'BR',
        bankCountryCode: 'US',
        bankName: 'Banco XYZ',
        swiftBic: 'BOFAUS3N',
        accountNumber: 'BR1800000000141455970000123456',
        currency: 'USD',
        nickname: 'Fornecedor principal',
      }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Beneficiário cadastrado com sucesso',
    )
  })

  it('submits SEPA with the IBAN and structured address instead of the SWIFT defaults', async () => {
    const user = userEvent.setup()
    renderCreate()
    await fillIdentification(user)
    await user.selectOptions(screen.getByLabelText('Tipo de transferência *'), 'sepa')
    await user.type(screen.getByLabelText('País do beneficiário (código de 3 letras) *'), 'deu')
    await user.type(screen.getByLabelText('Cidade do beneficiário *'), 'Berlin')
    await user.type(screen.getByLabelText('Código postal do beneficiário *'), '10115')
    await user.type(screen.getByLabelText('IBAN *'), 'de89 3704 0044 0532 0130 00')
    await user.type(screen.getByLabelText('Moeda de recebimento *'), 'eur')
    await user.type(screen.getByLabelText('Apelido do beneficiário *'), 'SEPA supplier')
    await user.click(screen.getByLabelText(/confirmo que os dados/i))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith('company-1', {
        beneficiaryType: 'LEGAL_ENTITY',
        legalName: 'Fornecedor Global Ltda.',
        identificationDocument: '12345678900',
        country: 'Brasil',
        address: 'Av. Paulista, 1000',
        confirmed: true,
        receivingMethod: 'BANK_ACCOUNT',
        paymentRail: 'sepa',
        countryCode: 'DEU',
        addressLine1: 'Av. Paulista, 1000',
        city: 'Berlin',
        postalCode: '10115',
        iban: 'DE89370400440532013000',
        currency: 'EUR',
        nickname: 'SEPA supplier',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Beneficiário cadastrado com sucesso',
    )
  })

  it('blocks incomplete SWIFT addresses before sending a request', async () => {
    const user = userEvent.setup()
    renderCreate()
    await fillIdentification(user)
    await fillBankFields(user)
    await user.clear(screen.getByLabelText('Cidade do beneficiário *'))
    await user.clear(screen.getByLabelText('País do banco (código de 2 letras) *'))
    await user.click(screen.getByLabelText(/confirmo que os dados/i))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(screen.getByLabelText('Cidade do beneficiário *')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('País do banco (código de 2 letras) *')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('blocks SEPA with a non-EUR currency or a two-letter country code', async () => {
    const user = userEvent.setup()
    renderCreate()
    await fillIdentification(user)
    await user.selectOptions(screen.getByLabelText('Tipo de transferência *'), 'sepa')
    await user.type(screen.getByLabelText('País do beneficiário (código de 3 letras) *'), 'DE')
    await user.type(screen.getByLabelText('Moeda de recebimento *'), 'USD')
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(screen.getByText('SEPA exige a moeda EUR.')).toBeInTheDocument()
    expect(screen.getByText('Informe o código do país com 3 letras.')).toBeInTheDocument()
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('submits a wallet beneficiary with the right shape', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.type(
      screen.getByLabelText('Endereço da wallet *'),
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    )
    await user.selectOptions(screen.getByLabelText('Rede blockchain *'), 'Polygon')
    await user.selectOptions(screen.getByLabelText('Moeda de recebimento *'), 'USDC')
    await user.selectOptions(screen.getByLabelText('Custódia da wallet *'), 'propria')
    await user.type(screen.getByLabelText('País do beneficiário (código de 2 letras) *'), 'br')
    await user.type(screen.getByLabelText('Apelido do beneficiário *'), 'Fornecedor cripto')
    await user.click(screen.getByLabelText(/confirmo que os dados/i))

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith('company-1', {
        beneficiaryType: 'LEGAL_ENTITY',
        legalName: 'Fornecedor Global Ltda.',
        identificationDocument: '12345678900',
        country: 'Brasil',
        address: 'Av. Paulista, 1000',
        confirmed: true,
        receivingMethod: 'CRYPTO_WALLET',
        walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        blockchainNetwork: 'polygon',
        nickname: 'Fornecedor cripto',
        currency: 'USDC',
        isSelfCustody: true,
        counterpartyName: 'Fornecedor Global Ltda.',
        counterpartyCountry: 'BR',
      }),
    )
  })

  it('requires an institution name and forwards false custody for an exchange wallet', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()
    await fillIdentification(user)
    await user.selectOptions(screen.getByLabelText('Tipo de beneficiário *'), 'Pessoa física')
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.type(screen.getByLabelText('Endereço da wallet *'), '0xabc')
    await user.selectOptions(screen.getByLabelText('Rede blockchain *'), 'Polygon')
    await user.selectOptions(screen.getByLabelText('Moeda de recebimento *'), 'USDC')
    await user.selectOptions(screen.getByLabelText('Custódia da wallet *'), 'instituicao')
    await user.type(screen.getByLabelText('País do beneficiário (código de 2 letras) *'), 'br')
    await user.type(screen.getByLabelText('Apelido do beneficiário *'), 'Exchange wallet')
    await user.click(screen.getByLabelText(/confirmo que os dados/i))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))
    expect(createBeneficiary).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Instituição custodiante *')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await user.type(screen.getByLabelText('Instituição custodiante *'), 'Test Exchange')
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))
    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          beneficiaryType: 'INDIVIDUAL',
          currency: 'USDC',
          isSelfCustody: false,
          custodianName: 'Test Exchange',
          counterpartyCountry: 'BR',
        }),
      ),
    )
  })

  it('shows a server error message when the request fails', async () => {
    vi.mocked(createBeneficiary).mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await fillBankFields(user)
    await user.click(screen.getByLabelText(/confirmo que os dados/i))

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })

  it('disables the submit button while saving', async () => {
    let resolveCreate!: (value: { id: string }) => void
    vi.mocked(createBeneficiary).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await fillBankFields(user)
    await user.click(screen.getByLabelText(/confirmo que os dados/i))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    resolveCreate({ id: 'beneficiary-1' })
    expect(await screen.findByRole('button', { name: 'Salvar beneficiário' })).toBeEnabled()
  })

  it('navigates back to the beneficiaries list when clicking Cancelar', async () => {
    const user = userEvent.setup()
    renderCreate()
    await waitForCompanyLoaded()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Lista de beneficiários')).toBeInTheDocument()
  })
})
