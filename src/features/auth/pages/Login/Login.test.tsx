import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PATHS } from '@/shared/navigation/paths'
import { authService } from '@/features/auth/api/login'
import { Login } from '@/features/auth/pages/Login/Login'

vi.mock('@/features/auth/api/login', () => ({
  authService: {
    login: vi.fn(),
    verify2fa: vi.fn(),
  },
}))

vi.mock('@/features/auth/api/twoFactor', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api/twoFactor')>(
    '@/features/auth/api/twoFactor',
  )
  return {
    ...actual,
    request2faRecovery: vi.fn().mockResolvedValue({ success: true, id: 'req-test-123' }),
  }
})

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={[PATHS.LOGIN]}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home page</p>} />
        <Route path={PATHS.ADMIN_CLIENTS} element={<p>Admin page</p>} />
        <Route path={PATHS.REGISTER} element={<p>Register page</p>} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<p>Forgot Password page</p>} />
        <Route path={PATHS.LOGIN} element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders the brand copy, heading and form fields', () => {
    renderLogin()

    expect(
      screen.getByText('Infraestrutura financeira para operações globais.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
  })

  it('shows an error when the email format is invalid', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'nao-e-um-email')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
  })

  it('clears a field error as the user retypes it', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'a')
    expect(screen.queryByText('E-mail é obrigatório')).not.toBeInTheDocument()
  })

  it('navigates to the forgot password page when the link is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { Authorization: 'Bearer token123' },
        }),
      ),
    )
    renderLogin()

    await user.click(screen.getByRole('link', { name: 'Esqueci minha senha' }))
    expect(await screen.findByText('Forgot Password page')).toBeInTheDocument()
  })

  it('stores the token and navigates admins to the clients page', async () => {
    const user = userEvent.setup()
    const mockAdminToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockAdminToken })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe(mockAdminToken)
  })

  it('stores the token and navigates users to the home page', async () => {
    const user = userEvent.setup()
    const mockUserToken = 'header.eyJyb2xlIjpbIlVTRVIiXX0=.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({ token: mockUserToken })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'cliente@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe(mockUserToken)
  })

  it('discards a leftover onboarding token after a successful login', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('vstable:onboarding:access-token', 'onboarding-token')
    vi.mocked(authService.login).mockResolvedValueOnce({ token: 'login-token' })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'cliente@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an error when credentials are rejected', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('E-mail ou senha inválidos'))
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findAllByText('E-mail ou senha inválidos')).toHaveLength(2)
  })

  it('shows a specific error when the user is locked', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Usuário bloqueado'))
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'bloqueado@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Usuário bloqueado')).toBeInTheDocument()
  })

  it('clears credential errors when either input changes', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockRejectedValue(new Error('E-mail ou senha inválidos'))
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'usuario@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findAllByText('E-mail ou senha inválidos')).toHaveLength(2)
    await user.type(screen.getByLabelText('E-mail'), 'x')
    expect(screen.getAllByText('E-mail ou senha inválidos')).toHaveLength(1)
    await user.type(screen.getByLabelText('Senha'), 'x')
    expect(screen.queryByText('E-mail ou senha inválidos')).not.toBeInTheDocument()
  })

  it('transições para a etapa de 2FA quando o login exige segundo fator', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'user2fa@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Verificação de Segurança')).toBeInTheDocument()
    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()
    expect(screen.getByLabelText('Código de autenticação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar e Entrar' })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('envia o código de 6 dígitos via verify2fa e conclui o login com sucesso sem salvar token antes', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    vi.mocked(authService.verify2fa).mockResolvedValueOnce({
      token: 'final-token-after-2fa',
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'user2fa@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Não deve ter token salvo antes de verificar o 2FA
    expect(localStorage.getItem('token')).toBeNull()

    const totpInput = await screen.findByLabelText('Código de autenticação')
    await user.type(totpInput, '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar e Entrar' }))

    expect(authService.verify2fa).toHaveBeenCalledWith({
      challengeToken: 'challenge-token-123',
      code: '123456',
    })
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('final-token-after-2fa')
  })

  it('redireciona admins para a página de clientes após confirmação de 2FA', async () => {
    const user = userEvent.setup()
    const mockAdminToken = 'header.eyJyb2xlIjpbIkFETUlOIl19.signature'
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-admin',
    })
    vi.mocked(authService.verify2fa).mockResolvedValueOnce({
      token: mockAdminToken,
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'admin@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const totpInput = await screen.findByLabelText('Código de autenticação')
    await user.type(totpInput, '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar e Entrar' }))

    expect(await screen.findByText('Admin page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe(mockAdminToken)
  })

  it('exibe mensagem de erro quando o código totp for rejeitado no login', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    vi.mocked(authService.verify2fa).mockRejectedValueOnce(
      new Error('Código de autenticação inválido ou expirado.'),
    )
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'user2fa@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const totpInput = await screen.findByLabelText('Código de autenticação')
    await user.type(totpInput, '000000')
    await user.click(screen.getByRole('button', { name: 'Verificar e Entrar' }))

    expect(
      await screen.findByText('Código de autenticação inválido ou expirado.'),
    ).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('permite voltar da etapa de 2FA para o formulário de credenciais', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'user2fa@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Verificação de Segurança')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar para o login' }))

    expect(screen.getByRole('heading', { name: 'Bem-vindo à V-Stable!' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('alterna para o modo de recuperação, oculta os textos de 6 dígitos e autentica com o código de emergência', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    vi.mocked(authService.verify2fa).mockResolvedValueOnce({
      token: 'jwt-via-recovery',
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'user2fa@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Verifica que na etapa de 6 dígitos o texto de 6 dígitos está presente
    expect(
      await screen.findByText('Confirme o acesso com o código de 6 dígitos'),
    ).toBeInTheDocument()
    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()

    // Clica para usar código de recuperação
    await user.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    // Os textos de 6 dígitos não devem mais estar visíveis
    expect(
      screen.queryByText('Confirme o acesso com o código de 6 dígitos'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Autenticação em duas etapas')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador/),
    ).not.toBeInTheDocument()

    // Preenche o código de recuperação de 8 caracteres
    const recoveryInput = screen.getByTestId('recovery-code-input')
    await user.type(recoveryInput, 'abcd1234')
    await user.click(screen.getByRole('button', { name: 'Verificar código de recuperação' }))

    expect(authService.verify2fa).toHaveBeenCalledWith({
      challengeToken: 'challenge-token-123',
      code: 'ABCD1234',
    })
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('jwt-via-recovery')
  })

  it('permite solicitar recuperação de 2FA quando o usuário não tem acesso ao celular nem aos códigos de emergência', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      requires2fa: true,
      challengeToken: 'challenge-token-123',
    })
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'perdi@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Na etapa 2FA, clica na opção
    await user.click(
      await screen.findByRole('button', {
        name: 'Não tenho acesso ao autenticador nem aos códigos de recuperação',
      }),
    )

    // Exibe o formulário de recuperação
    expect(screen.getByText('Recuperação de Acesso (2FA)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('perdi@empresa.com')).toBeInTheDocument()

    // Preenche dados
    await user.type(screen.getByLabelText('Nome completo do titular*'), 'Marina Costa')
    await user.type(screen.getByLabelText('CPF ou Documento de Identificação*'), '123.456.789-00')

    await user.click(screen.getByRole('button', { name: 'Enviar solicitação para análise' }))

    // Exibe tela de status com o aviso de 48h
    expect(await screen.findByText('Solicitação enviada com sucesso')).toBeInTheDocument()
    expect(screen.getByText('Solicitação em análise')).toBeInTheDocument()
    expect(
      screen.getByText(/saques e transferências ficarão bloqueados por 48 horas/i),
    ).toBeInTheDocument()
  })
})

describe('Login destination and expired session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  function renderFrom(
    state: unknown,
    resolveDestination?: (from: string | null) => Promise<string>,
  ) {
    return render(
      <MemoryRouter initialEntries={[{ pathname: PATHS.LOGIN, state }]}>
        <Routes>
          <Route path={PATHS.HOME} element={<p>Home page</p>} />
          <Route path={PATHS.TRANSFERS} element={<p>Transfers page</p>} />
          <Route path="/register/kyc-1/compliance" element={<p>Compliance page</p>} />
          <Route path={PATHS.LOGIN} element={<Login resolveDestination={resolveDestination} />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  async function submit() {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({ token: 'login-token' })
    await user.type(screen.getByLabelText('E-mail'), 'cliente@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-valida')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  it('given a protected origin, when the login succeeds, then it returns to that route', async () => {
    renderFrom({ from: PATHS.TRANSFERS })

    await submit()

    expect(await screen.findByText('Transfers page')).toBeInTheDocument()
  })

  it('given an injected resolver, when the login succeeds, then it follows the resolved destination', async () => {
    const resolveDestination = vi.fn().mockResolvedValue('/register/kyc-1/compliance')
    renderFrom({ from: PATHS.TRANSFERS }, resolveDestination)

    await submit()

    expect(await screen.findByText('Compliance page')).toBeInTheDocument()
    expect(resolveDestination).toHaveBeenCalledWith(PATHS.TRANSFERS)
  })

  it('given a failing resolver, when the login succeeds, then it falls back to the origin', async () => {
    renderFrom({ from: PATHS.TRANSFERS }, vi.fn().mockRejectedValue(new Error('offline')))

    await submit()

    expect(await screen.findByText('Transfers page')).toBeInTheDocument()
  })

  it.each(['https://malicioso.example', '//malicioso.example'])(
    'given the external origin %s, when the login succeeds, then it ignores it and goes home',
    async (from) => {
      renderFrom({ from })

      await submit()

      expect(await screen.findByText('Home page')).toBeInTheDocument()
    },
  )

  it('given an expired session, when the page opens, then it warns once and clears the mark', () => {
    sessionStorage.setItem('vstable:session-expired', 'true')

    renderFrom(null)

    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou')
    expect(sessionStorage.getItem('vstable:session-expired')).toBeNull()
  })

  it('given no expired session, when the page opens, then it shows no warning', () => {
    renderFrom(null)

    expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument()
  })
})
