import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from './AppRoutes'
import { compliancePath, livenessPath, PATHS, registrationCompletePath } from './paths'
import { ApiError } from '@/features/login/compliance/services/onboarding'

const { submitOnboardingMock } = vi.hoisted(() => ({ submitOnboardingMock: vi.fn() }))
const { startDocumentUploadMock, uploadFileToS3Mock, submitDocumentResultMock } = vi.hoisted(
  () => ({
    startDocumentUploadMock: vi.fn(),
    uploadFileToS3Mock: vi.fn(),
    submitDocumentResultMock: vi.fn(),
  }),
)

vi.mock('@/features/login/compliance/services/onboarding', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/login/compliance/services/onboarding')>()
  return { ...actual, submitOnboarding: submitOnboardingMock }
})

vi.mock('@/features/login/compliance/services/compliance', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/login/compliance/services/compliance')>()
  return {
    ...actual,
    startDocumentUpload: startDocumentUploadMock,
    uploadFileToS3: uploadFileToS3Mock,
    submitDocumentResult: submitDocumentResultMock,
  }
})

const id = '11111111-1111-4111-8111-111111111111'

const access = {
  nomeCompleto: 'Maria Silva',
  email: 'maria@empresa.com',
  senha: 'segura123!',
  confirmarSenha: 'segura123!',
}
const company = {
  razaoSocial: 'Empresa Ltda.',
  pais: 'Brasil',
  cnpj: '11.222.333/0001-81',
  cep: '90000-000',
  cidade: '',
  estado: 'RS',
}

async function fillRepresentativeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)')
  await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725')
  await user.type(screen.getByLabelText('Data de nascimento *'), '1990-01-01')
  await user.type(screen.getByLabelText('Telefone *'), '11987654321')
  await user.type(screen.getByPlaceholderText('00000-000'), '90000000')
  await user.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste, 100')
  await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
  await user.selectOptions(screen.getByLabelText(/estado/i), 'SP')
  await user.type(screen.getByLabelText(/país/i), 'Brasil')
}

describe('AppRoutes Navigation & Routing', () => {
  beforeEach(() => {
    submitOnboardingMock.mockReset()
    startDocumentUploadMock.mockReset()
    uploadFileToS3Mock.mockReset()
    submitDocumentResultMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Home page for the root path', () => {
    const initialRoute = PATHS.HOME

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Visão geral da conta PME' })).toBeInTheDocument()
  })

  it('renders the Login page for the login path', () => {
    const initialRoute = PATHS.LOGIN

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  })

  it('given the user navigates to the register path, when AppRoutes is rendered, then it should render the access step of the register wizard', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the company or representative steps are opened without navigation state, when AppRoutes is rendered, then it should redirect back to the access step', () => {
    render(
      <MemoryRouter initialEntries={[PATHS.REGISTER_REPRESENTATIVE]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the user navigates to the compliance path with a kyc verification id, when AppRoutes is rendered, then it should render the ComplianceStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('given the user navigates to the compliance liveness path with a kyc verification id, when AppRoutes is rendered, then it should render the LivenessStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[livenessPath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Verificação facial')).toBeInTheDocument()
    // Sem progressoCadastroId a tela cai no branch de erro ao iniciar; com o id vindo da
    // URL, o botão de iniciar não deve estar desabilitado por falta de contexto.
    expect(screen.getByRole('button', { name: 'Iniciar verificação facial' })).toBeEnabled()
  })

  it('given the user navigates to the registration-complete path, when AppRoutes is rendered, then it should render the RegistrationComplete page', () => {
    render(
      <MemoryRouter initialEntries={[registrationCompletePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro enviado' })).toBeInTheDocument()
  })

  it('renders the placeholder screen for the forgot password path', () => {
    const initialRoute = PATHS.FORGOT_PASSWORD

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Recuperação de Senha (Em breve)')).toBeInTheDocument()
  })

  it('redirects to the Home page for an unknown route', () => {
    const unknownRoute = '/unknown-non-existent-route'

    render(
      <MemoryRouter initialEntries={[unknownRoute]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Visão geral da conta PME' })).toBeInTheDocument()
  })

  it('walks the full wizard from access to the liveness step on a happy path', async () => {
    const user = userEvent.setup()
    submitOnboardingMock.mockResolvedValueOnce({
      userId: 'user-1',
      companyId: 'company-1',
      kycVerificationId: id,
      accessToken: 'token-abc',
    })
    startDocumentUploadMock.mockResolvedValueOnce({
      id: 'doc-1',
      uploadUrlFront: 'https://s3.example.com/front',
    })
    uploadFileToS3Mock.mockResolvedValueOnce(undefined)
    submitDocumentResultMock.mockResolvedValueOnce(undefined)

    render(
      <MemoryRouter initialEntries={[PATHS.REGISTER]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nome completo'), access.nomeCompleto)
    await user.type(screen.getByLabelText('E-mail'), access.email)
    await user.type(screen.getByLabelText('Senha'), access.senha)
    await user.type(screen.getByLabelText('Confirmar senha'), access.confirmarSenha)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Razão Social *' }), company.razaoSocial)
    await user.clear(screen.getByRole('textbox', { name: 'CNPJ *' }))
    await user.type(screen.getByRole('textbox', { name: 'CNPJ *' }), company.cnpj)
    await user.clear(screen.getByRole('textbox', { name: 'CEP *' }))
    await user.type(screen.getByRole('textbox', { name: 'CEP *' }), company.cep)
    await user.type(screen.getByRole('textbox', { name: 'Estado *' }), company.estado)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Dados do Representante' }),
    ).toBeInTheDocument()
    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Compliance e documentos')).toBeInTheDocument()
    expect(submitOnboardingMock).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: access.nomeCompleto, email: access.email }),
      expect.objectContaining({ razaoSocial: company.razaoSocial }),
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['doc'], 'passaporte.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Verificação facial')).toBeInTheDocument()
    expect(startDocumentUploadMock).toHaveBeenCalledWith(id, 'PASSPORT', false)
    expect(uploadFileToS3Mock).toHaveBeenCalledTimes(1)
    expect(submitDocumentResultMock).toHaveBeenCalledWith(id, 'doc-1')
  })

  it('shows the API message and preserves the form when representative submission fails with a client error', async () => {
    const user = userEvent.setup()
    submitOnboardingMock.mockRejectedValueOnce(new ApiError(422, 'CPF já usado em outro cadastro'))

    render(
      <MemoryRouter
        initialEntries={[{ pathname: PATHS.REGISTER_REPRESENTATIVE, state: { access, company } }]}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('CPF já usado em outro cadastro')
    expect(screen.getByLabelText(/linha de endereço/i)).toHaveValue('Rua Teste, 100')
  })

  it('shows a generic message when representative submission fails with a server error', async () => {
    const user = userEvent.setup()
    submitOnboardingMock.mockRejectedValueOnce(new Error('network down'))

    render(
      <MemoryRouter
        initialEntries={[{ pathname: PATHS.REGISTER_REPRESENTATIVE, state: { access, company } }]}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })

  it('uploads both sides of a double-sided document before advancing to liveness', async () => {
    const user = userEvent.setup()
    startDocumentUploadMock.mockResolvedValueOnce({
      id: 'doc-2',
      uploadUrlFront: 'https://s3.example.com/front',
      uploadUrlBack: 'https://s3.example.com/back',
    })
    uploadFileToS3Mock.mockResolvedValue(undefined)
    submitDocumentResultMock.mockResolvedValueOnce(undefined)

    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'ID')
    await user.upload(screen.getByTestId('file-input'), [
      new File(['front'], 'rg-frente.pdf', { type: 'application/pdf' }),
      new File(['back'], 'rg-verso.pdf', { type: 'application/pdf' }),
    ])
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Verificação facial')).toBeInTheDocument()
    expect(startDocumentUploadMock).toHaveBeenCalledWith(id, 'ID', true)
    expect(uploadFileToS3Mock).toHaveBeenCalledTimes(2)
    expect(uploadFileToS3Mock).toHaveBeenNthCalledWith(
      1,
      'https://s3.example.com/front',
      expect.any(File),
    )
    expect(uploadFileToS3Mock).toHaveBeenNthCalledWith(
      2,
      'https://s3.example.com/back',
      expect.any(File),
    )
  })

  it('shows a generic error when the document upload fails', async () => {
    const user = userEvent.setup()
    startDocumentUploadMock.mockRejectedValueOnce(new Error('upload failed'))

    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['doc'], 'passaporte.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar o documento. Tente novamente.',
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled(),
    )
  })
})
