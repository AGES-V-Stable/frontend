import { SessionProvider } from '@/features/auth'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from '@/app/AppRoutes'
import {
  compliancePath,
  livenessPath,
  PATHS,
  registrationCompletePath,
} from '@/shared/navigation/paths'
import {
  ApiError,
  getRepresentativePersonalData,
  saveRepresentativePersonalData,
} from '@/features/onboarding/api/onboarding'
import {
  getAccessToken,
  getLoginToken,
  saveAccessToken,
  saveLoginToken,
} from '@/shared/http/authToken'
import {
  getLivenessId,
  getLivenessStatus,
  saveLivenessSession,
} from '@/features/onboarding/api/liveness'
import { pendingOnboardingPath } from '@/features/onboarding/model/registrationStatus'
import {
  INVITATION_LINK_HASH,
  json,
  resolvedInvitation,
  stubApi,
  requestsTo,
  userWithoutCompany,
} from '@/test/fixtures/companyInvitation'

const { submitOnboardingMock, registerCompanyMock } = vi.hoisted(() => ({
  submitOnboardingMock: vi.fn(),
  registerCompanyMock: vi.fn(),
}))
const { getAveniaTermsMock, acceptAveniaTermsMock } = vi.hoisted(() => ({
  getAveniaTermsMock: vi.fn(),
  acceptAveniaTermsMock: vi.fn(),
}))
const { startDocumentUploadMock, uploadFileToS3Mock, submitDocumentResultMock } = vi.hoisted(
  () => ({
    startDocumentUploadMock: vi.fn(),
    uploadFileToS3Mock: vi.fn(),
    submitDocumentResultMock: vi.fn(),
  }),
)

vi.mock('@/features/onboarding/api/onboarding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/onboarding/api/onboarding')>()
  return {
    ...actual,
    submitOnboarding: submitOnboardingMock,
    registerCompany: registerCompanyMock,
    getRegistrationTerms: vi.fn().mockResolvedValue({
      version: 'v1',
      termsUrl: 'https://app.example.test/termos',
      privacyUrl: 'https://app.example.test/privacidade',
    }),
  }
})

vi.mock('@/features/onboarding/api/compliance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/onboarding/api/compliance')>()
  return {
    ...actual,
    startDocumentUpload: startDocumentUploadMock,
    getAveniaTerms: getAveniaTermsMock,
    acceptAveniaTerms: acceptAveniaTermsMock,
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
  termsVersion: 'v1',
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

function CurrentPath() {
  return <output aria-label="Rota atual">{useLocation().pathname}</output>
}

describe('AppRoutes Navigation & Routing', () => {
  beforeEach(() => {
    sessionStorage.clear()
    submitOnboardingMock.mockReset()
    startDocumentUploadMock.mockReset()
    uploadFileToS3Mock.mockReset()
    submitDocumentResultMock.mockReset()
    // Por padrão os termos da Avenia já foram aceitos; o teste do aceite troca o retorno.
    getAveniaTermsMock.mockReset().mockResolvedValue({ version: 2, accepted: true, documents: [] })
    acceptAveniaTermsMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Home page for the root path', () => {
    const initialRoute = PATHS.HOME

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  })

  it('renders the Login page for the login path', () => {
    const initialRoute = PATHS.LOGIN

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  })

  it('given the user navigates to the register path, when AppRoutes is rendered, then it should render the access step of the register wizard', () => {
    const initialRoute = PATHS.REGISTER

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the company or representative steps are opened without navigation state, when AppRoutes is rendered, then it should redirect back to the access step', () => {
    render(
      <MemoryRouter initialEntries={[PATHS.REGISTER_REPRESENTATIVE]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dados de acesso' })).toBeInTheDocument()
  })

  it('given the user navigates to the compliance path with a kyc verification id, when AppRoutes is rendered, then it should render the ComplianceStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Cadastro Institucional' })).toBeInTheDocument()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('given the user navigates to the compliance liveness path with a kyc verification id, when AppRoutes is rendered, then it should render the LivenessStep page with that id wired in', () => {
    render(
      <MemoryRouter initialEntries={[livenessPath(id)]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Verificação facial' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 5 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar verificação facial' })).toBeEnabled()
  })

  it('resumes pending facial verification with the same final-step header and locked continuation', () => {
    saveLivenessSession('resumed-liveness', 'pending', id)
    const resumedPath = pendingOnboardingPath({
      kycVerificationId: id,
      companyId: 'company-1',
      status: 'PENDING',
      documentSubmitted: true,
      livenessSubmitted: false,
    })
    expect(resumedPath).toBe(livenessPath(id))
    render(
      <MemoryRouter initialEntries={[resumedPath!]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Verificação facial' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 5 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar conclusão' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(getLivenessStatus(id)).toBe('pending')
  })

  it.each(['rejected KYC', 'failed KYC', 'failed liveness submission'])(
    'keeps the final step and retry state after %s without showing confirmation',
    async (failure) => {
      const user = userEvent.setup({ delay: null })
      const base = `/v1/onboarding/${id}/compliance`
      const fetchMock = stubApi({
        [`PUT ${base}/liveness`]:
          failure === 'failed liveness submission'
            ? json({ message: 'Falha simulada' }, { status: 503 })
            : new Response(null, { status: 204 }),
        [`POST ${base}/kyc`]:
          failure === 'rejected KYC'
            ? json({
                aveniaProcessId: 'process-1',
                status: 'REJECTED',
                resultMessage: 'Documento ilegível',
              })
            : json({ message: 'Falha simulada' }, { status: 503 }),
      })
      saveLivenessSession('liveness-1', 'success', id)
      saveAccessToken('synthetic-onboarding-token')
      saveRepresentativePersonalData({
        fullName: 'Maria Teste',
        email: 'maria@example.test',
        phone: '11987654321',
        dateOfBirth: '1990-01-01',
        taxIdNumber: '52998224725',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
        zipCode: '90000000',
        streetAddress: 'Rua Teste, 100',
      })
      render(
        <MemoryRouter initialEntries={[livenessPath(id)]}>
          <SessionProvider>
            <AppRoutes />
          </SessionProvider>
        </MemoryRouter>,
      )
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        failure === 'rejected KYC'
          ? 'Documento ilegível'
          : 'Não foi possível confirmar a verificação',
      )
      expect(screen.queryByRole('heading', { name: 'Cadastro enviado' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Passo 5 de 5')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
      expect(getRepresentativePersonalData()).not.toBeNull()
      expect(getAccessToken()).toBe('synthetic-onboarding-token')
      expect(getLoginToken()).toBeNull()
      expect(getLivenessId(id)).toBe('liveness-1')
      expect(requestsTo(fetchMock, `POST ${base}/kyc`)).toHaveLength(
        failure === 'failed liveness submission' ? 0 : 1,
      )
    },
  )

  it('redirects the legacy registration-complete URL to the authenticated status screen', async () => {
    saveLoginToken('synthetic-login-token')
    stubApi({
      'GET /v1/users/me': json({ ...userWithoutCompany, twoFactorEnabled: true }),
      'GET /v1/onboarding/me': json({
        kycVerificationId: id,
        companyId: 'company-1',
        status: 'UNDER_REVIEW',
        documentSubmitted: true,
        livenessSubmitted: true,
      }),
    })
    render(
      <MemoryRouter initialEntries={[registrationCompletePath(id)]}>
        <CurrentPath />
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Seu cadastro está em análise' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Rota atual')).toHaveTextContent(PATHS.REGISTER_STATUS)
    expect(screen.queryByRole('heading', { name: 'Cadastro enviado' })).not.toBeInTheDocument()
    expect(getLoginToken()).toBe('synthetic-login-token')
  })

  it('renders the placeholder screen for the forgot password path', () => {
    const initialRoute = PATHS.FORGOT_PASSWORD

    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Recuperação de Senha (Em breve)')).toBeInTheDocument()
  })

  it('redirects to the Home page for an unknown route', () => {
    const unknownRoute = '/unknown-non-existent-route'

    render(
      <MemoryRouter initialEntries={[unknownRoute]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
  })

  it('walks the full wizard through hosted verification and final KYC to authenticated status', async () => {
    const user = userEvent.setup({ delay: null })
    const base = `/v1/onboarding/${id}/compliance`
    const fetchMock = stubApi({
      [`POST ${base}/liveness`]: json({
        id: 'liveness-1',
        sessionId: null,
        livenessUrl: 'https://verification.example.test/facial',
        validateLivenessToken: null,
      }),
      [`GET ${base}/liveness/status?livenessId=liveness-1`]: [
        json({ ready: false, status: 'WAITING-UPLOAD' }),
        json({ ready: true, status: 'UPLOADED' }),
      ],
      [`PUT ${base}/liveness`]: new Response(null, { status: 204 }),
      [`POST ${base}/kyc`]: json({ aveniaProcessId: 'process-1', status: 'UNDER_REVIEW' }),
      'GET /v1/users/me': json({ ...userWithoutCompany, twoFactorEnabled: true }),
      'GET /v1/onboarding/me': json({
        kycVerificationId: id,
        companyId: 'company-1',
        status: 'UNDER_REVIEW',
        documentSubmitted: true,
        livenessSubmitted: true,
      }),
    })
    const hostedTab = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.stubGlobal('open', vi.fn().mockReturnValue(hostedTab))
    // The registration API is mocked above; reproduce its token persistence side effect.
    saveAccessToken('synthetic-onboarding-token')
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
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nome completo'), access.nomeCompleto)
    await user.type(screen.getByLabelText('E-mail'), access.email)
    await user.type(screen.getByLabelText('Senha'), access.senha)
    await user.type(screen.getByLabelText('Confirmar senha'), access.confirmarSenha)
    await user.click(await screen.findByRole('checkbox', { name: /Li e aceito/ }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Razão Social *' }), company.razaoSocial)
    await user.type(screen.getByRole('textbox', { name: 'CNPJ *' }), company.cnpj)
    await user.type(screen.getByRole('textbox', { name: 'CEP *' }), company.cep)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado *' }), company.estado)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Dados do Representante' }),
    ).toBeInTheDocument()

    await fillRepresentativeForm(user)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByRole('heading', { name: 'Segurança da Conta (2FA)' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Configurar 2FA mais tarde' }))

    expect(await screen.findByText('Compliance e documentos')).toBeInTheDocument()
    expect(submitOnboardingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: access.nomeCompleto,
        email: access.email,
        termsVersion: 'v1',
      }),
      expect.objectContaining({ razaoSocial: company.razaoSocial }),
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['doc'], 'passaporte.pdf', { type: 'application/pdf' }),
    )
    await screen.findByText('Termos da Avenia aceitos.')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Verificação facial' }),
    ).toBeInTheDocument()
    expect(startDocumentUploadMock).toHaveBeenCalledWith(id, 'PASSPORT', false)
    expect(uploadFileToS3Mock).toHaveBeenCalledTimes(1)
    expect(submitDocumentResultMock).toHaveBeenCalledWith(id, 'doc-1')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Passo 5 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    const personalData = getRepresentativePersonalData()
    expect(personalData).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))
    expect(hostedTab.opener).toBeNull()
    expect(hostedTab.location.href).toBe('https://verification.example.test/facial')
    expect(getLivenessId(id)).toBe('liveness-1')
    await user.click(screen.getByRole('button', { name: 'Verificar conclusão' }))
    expect(await screen.findByRole('status')).toHaveTextContent('ainda não concluída')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(requestsTo(fetchMock, `POST ${base}/kyc`)).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Cadastro enviado' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Verificar conclusão' }))
    expect(await screen.findByText('Verificação concluída com sucesso.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(
      await screen.findByRole('heading', { name: 'Seu cadastro está em análise' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cadastro enviado' })).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /v1/onboarding/me')).toEqual([
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer synthetic-onboarding-token' }),
      }),
    ])
    expect(requestsTo(fetchMock, `PUT ${base}/liveness`)).toEqual([
      expect.objectContaining({ body: { livenessId: 'liveness-1' } }),
    ])
    expect(requestsTo(fetchMock, `POST ${base}/kyc`)).toEqual([
      expect.objectContaining({ body: personalData }),
    ])
    expect(getRepresentativePersonalData()).toBeNull()
    expect(getAccessToken()).toBe('synthetic-onboarding-token')
    expect(getLoginToken()).toBe('synthetic-onboarding-token')
    expect(getLivenessId(id)).toBeNull()
  }, 15000)

  it('shows the API message and preserves the form when representative submission fails with a client error', async () => {
    const user = userEvent.setup({ delay: null })
    submitOnboardingMock.mockRejectedValueOnce(new ApiError(422, 'CPF já usado em outro cadastro'))

    render(
      <MemoryRouter
        initialEntries={[{ pathname: PATHS.REGISTER_REPRESENTATIVE, state: { access, company } }]}
      >
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('CPF já usado em outro cadastro')
    expect(screen.getByLabelText(/linha de endereço/i)).toHaveValue('Rua Teste, 100')
  })

  it('shows a generic message when representative submission fails with a server error', async () => {
    const user = userEvent.setup({ delay: null })
    submitOnboardingMock.mockRejectedValueOnce(new Error('network down'))

    render(
      <MemoryRouter
        initialEntries={[{ pathname: PATHS.REGISTER_REPRESENTATIVE, state: { access, company } }]}
      >
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })

  it('uploads both sides of a double-sided document before advancing to liveness', async () => {
    const user = userEvent.setup({ delay: null })
    startDocumentUploadMock.mockResolvedValueOnce({
      id: 'doc-2',
      uploadUrlFront: 'https://s3.example.com/front',
      uploadUrlBack: 'https://s3.example.com/back',
    })
    uploadFileToS3Mock.mockResolvedValue(undefined)
    submitDocumentResultMock.mockResolvedValueOnce(undefined)

    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'ID')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['1'], 'rg_frente.png', { type: 'image/png' }),
    )
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['2'], 'rg_verso.png', { type: 'image/png' }),
    )
    await screen.findByText('Termos da Avenia aceitos.')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Verificação facial' }),
    ).toBeInTheDocument()
    expect(uploadFileToS3Mock).toHaveBeenCalledTimes(2)
  })

  it('requires accepting the Avenia terms before sending the identity document', async () => {
    const user = userEvent.setup({ delay: null })
    getAveniaTermsMock.mockResolvedValue({
      version: 2,
      accepted: false,
      documents: [
        { key: 'TERMS_OF_USE', name: 'Terms of Use', url: 'https://docs.avenia.test/terms.pdf' },
      ],
    })
    acceptAveniaTermsMock.mockResolvedValue({ version: 2, accepted: true, documents: [] })
    startDocumentUploadMock.mockRejectedValueOnce(new Error('stop after terms'))

    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Termos de uso' })).toHaveAttribute(
      'href',
      'https://docs.avenia.test/terms.pdf',
    )
    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['1'], 'doc.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(
      screen.getByText(
        'Aceite os termos de uso e a política de privacidade da Avenia para continuar.',
      ),
    ).toBeInTheDocument()
    expect(startDocumentUploadMock).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('checkbox', { name: /termos de uso e a política de privacidade da Avenia/ }),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    await waitFor(() => expect(acceptAveniaTermsMock).toHaveBeenCalledWith(id, 2))
    await waitFor(() => expect(startDocumentUploadMock).toHaveBeenCalled())
  })

  it('shows a generic error when the document upload fails', async () => {
    const user = userEvent.setup({ delay: null })
    startDocumentUploadMock.mockRejectedValueOnce(new Error('upload failed'))

    render(
      <MemoryRouter initialEntries={[compliancePath(id)]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      new File(['1'], 'doc.pdf', { type: 'application/pdf' }),
    )
    await screen.findByText('Termos da Avenia aceitos.')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar o documento. Tente novamente.',
    )
  })
})

describe('usuário autenticado sem empresa (backend#64)', () => {
  let hasCompany: boolean

  const sessionUser = () => ({
    id: 'u1',
    name: 'Maria Silva',
    email: 'maria@empresa.com',
    companyId: hasCompany ? 'company-1' : null,
    companyAccess: null,
    accountType: 'USER',
    roles: ['ROLE_USER'],
  })

  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

  async function fillCompanyForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole('textbox', { name: 'Razão Social *' }), company.razaoSocial)
    await user.type(screen.getByRole('textbox', { name: 'CNPJ *' }), company.cnpj)
    await user.type(screen.getByRole('textbox', { name: 'CEP *' }), company.cep)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado *' }), company.estado)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
  }

  beforeEach(() => {
    hasCompany = false
    registerCompanyMock.mockReset()
    localStorage.setItem('token', 'login-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/v1/users/me') return new Response(JSON.stringify(sessionUser()))
        if (url === '/v1/companies/company-1')
          return new Response(
            JSON.stringify({
              id: 'company-1',
              legalName: company.razaoSocial,
              cnpj: '11222333000181',
            }),
          )
        throw new Error(`Unexpected test request: ${url}`)
      }),
    )
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('given no company, when opening a company page, then it offers to register the company', async () => {
    renderAt(PATHS.DASHBOARD)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta conta não possui vínculo empresarial.',
    )
    expect(screen.getByRole('link', { name: 'Cadastrar empresa' })).toHaveAttribute(
      'href',
      PATHS.COMPANY_SETUP,
    )
  })

  it('given no company, when the user chooses to sign out, then the login token is cleared', async () => {
    const user = userEvent.setup({ delay: null })
    renderAt(PATHS.DASHBOARD)
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(localStorage.getItem('token')).toBeNull()
  })

  it('registers the company, keeps the representative data for KYC and continues to compliance', async () => {
    const user = userEvent.setup({ delay: null })
    registerCompanyMock.mockImplementationOnce(async () => {
      hasCompany = true
      return { userId: 'u1', companyId: 'company-1', kycVerificationId: id }
    })
    renderAt(PATHS.COMPANY_SETUP)

    expect(
      await screen.findByRole('heading', { name: 'Cadastro Institucional' }),
    ).toBeInTheDocument()
    await fillCompanyForm(user)
    expect(
      await screen.findByRole('heading', { name: 'Dados do Representante' }),
    ).toBeInTheDocument()
    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Compliance e documentos')).toBeInTheDocument()
    expect(registerCompanyMock).toHaveBeenCalledWith(
      expect.objectContaining({ razaoSocial: company.razaoSocial, cnpj: company.cnpj }),
    )
    // Ao sair do cadastro da empresa, a sessão é recarregada e passa a ter a empresa.
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/v1/users/me')).toHaveLength(2),
    )
    const personal = JSON.parse(
      sessionStorage.getItem('vstable:onboarding:representative-personal-data') ?? '{}',
    )
    expect(personal).toMatchObject({
      fullName: 'Maria Silva',
      email: 'maria@empresa.com',
      taxIdNumber: '52998224725',
    })
  }, 15000)

  it('explains that a registered CNPJ needs an invitation instead of joining the company', async () => {
    const user = userEvent.setup({ delay: null })
    registerCompanyMock.mockRejectedValueOnce(new ApiError(409, 'CNPJ already registered'))
    renderAt(PATHS.COMPANY_SETUP)

    await screen.findByRole('heading', { name: 'Cadastro Institucional' })
    await fillCompanyForm(user)
    await screen.findByRole('heading', { name: 'Dados do Representante' })
    await fillRepresentativeForm(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este CNPJ já está cadastrado. Para acessar uma empresa existente, peça um convite ao gestor dela.',
    )
    expect(screen.getByRole('heading', { name: 'Dados do Representante' })).toBeInTheDocument()
  }, 15000)

  it('sends a user who already has a company away from the company registration', async () => {
    hasCompany = true

    renderAt(PATHS.COMPANY_SETUP)

    await screen.findByText(/./)
    expect(
      screen.queryByRole('heading', { name: 'Cadastro Institucional' }),
    ).not.toBeInTheDocument()
    expect(registerCompanyMock).not.toHaveBeenCalled()
  })
})

describe('AppRoutes company invitation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('opens the public invitation link without requiring a session', async () => {
    stubApi({ 'POST /v1/company-invitations/resolve': json(resolvedInvitation) })

    render(
      <MemoryRouter initialEntries={[`${PATHS.COMPANY_INVITATION}${INVITATION_LINK_HASH}`]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Você foi convidado para acessar Cooperativa AgroSul',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceitar e acessar' })).toBeInTheDocument()
  })
})
