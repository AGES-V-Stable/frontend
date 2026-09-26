import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser } from '@/services/user'
import { createBeneficiary } from '@/services/beneficiary'
import { BeneficiaryCreate } from './BeneficiaryCreate'

vi.mock('@/services/user', () => ({
  getCurrentUser: vi.fn(),
}))
vi.mock('@/services/beneficiary', () => ({
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
  await waitFor(() => expect(getCurrentUser).toHaveBeenCalled())
}

describe('BeneficiaryCreate', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
    vi.mocked(createBeneficiary).mockResolvedValue({ id: 'beneficiary-1' })
  })

  it('shows the bank account fields by default and switches to wallet fields on toggle', async () => {
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)

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
    render(<BeneficiaryCreate />)

    await user.type(screen.getByLabelText('Banco *'), 'Banco XYZ')
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.type(screen.getByLabelText('Endereço da wallet *'), '0xabc')
    await user.click(screen.getByRole('tab', { name: 'Conta bancária' }))

    expect(screen.getByLabelText('Banco *')).toHaveValue('Banco XYZ')
  })

  it('blocks submit and shows required-field errors when the form is empty', async () => {
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findAllByText('Campo obrigatório.')).not.toHaveLength(0)
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('blocks submit when the confirmation checkbox is not checked', async () => {
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)

    await fillIdentification(user)
    await fillBankFields(user)

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(await screen.findByText('Confirme a revisão dos dados.')).toBeInTheDocument()
    expect(createBeneficiary).not.toHaveBeenCalled()
  })

  it('submits a bank account beneficiary and shows the success banner', async () => {
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await fillBankFields(user)
    await user.click(screen.getByLabelText(/confirmo que os dados/i))

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith('company-1', {
        tipoBeneficiario: 'Pessoa jurídica',
        nomeCompleto: 'Fornecedor Global Ltda.',
        documentoFiscal: '12345678900',
        pais: 'Brasil',
        endereco: 'Av. Paulista, 1000',
        metodoRecebimento: 'conta_bancaria',
        banco: 'Banco XYZ',
        swiftBic: 'BOFAUS3N',
        ibanNumeroConta: 'BR1800000000141455970000123456',
        moedaRecebimento: 'USD',
        apelido: 'Fornecedor principal',
      }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Beneficiário cadastrado com sucesso',
    )
  })

  it('submits a wallet beneficiary with the right shape', async () => {
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await user.click(screen.getByRole('tab', { name: 'Wallet cripto' }))
    await user.type(
      screen.getByLabelText('Endereço da wallet *'),
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    )
    await user.selectOptions(screen.getByLabelText('Rede blockchain *'), 'Polygon')
    await user.type(screen.getByLabelText('Apelido do beneficiário *'), 'Fornecedor cripto')
    await user.click(screen.getByLabelText(/confirmo que os dados/i))

    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    await waitFor(() =>
      expect(createBeneficiary).toHaveBeenCalledWith('company-1', {
        tipoBeneficiario: 'Pessoa jurídica',
        nomeCompleto: 'Fornecedor Global Ltda.',
        documentoFiscal: '12345678900',
        pais: 'Brasil',
        endereco: 'Av. Paulista, 1000',
        metodoRecebimento: 'wallet_cripto',
        enderecoWallet: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        redeBlockchain: 'Polygon',
        apelido: 'Fornecedor cripto',
      }),
    )
  })

  it('shows a server error message when the request fails', async () => {
    vi.mocked(createBeneficiary).mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    render(<BeneficiaryCreate />)
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
    render(<BeneficiaryCreate />)
    await waitForCompanyLoaded()

    await fillIdentification(user)
    await fillBankFields(user)
    await user.click(screen.getByLabelText(/confirmo que os dados/i))
    await user.click(screen.getByRole('button', { name: 'Salvar beneficiário' }))

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    resolveCreate({ id: 'beneficiary-1' })
    expect(await screen.findByRole('button', { name: 'Salvar beneficiário' })).toBeEnabled()
  })
})
