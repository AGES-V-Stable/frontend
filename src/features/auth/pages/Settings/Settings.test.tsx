import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Settings } from './Settings'
import { twoFactorService } from '@/features/auth'

vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth')>('@/features/auth')
  return {
    ...actual,
    useSession: vi.fn().mockReturnValue({
      user: { name: 'Arthur Dev', email: 'arthur@empresa.com' },
      status: 'authenticated',
    }),
    twoFactorService: {
      isActivated: vi.fn(),
      setActivated: vi.fn(),
      setup: vi.fn(),
      activate: vi.fn(),
    },
  }
})

describe('Settings Page - Fluxo de Reconfigurar 2FA (State Machine)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderSettings(props = {}) {
    return render(
      <MemoryRouter>
        <Settings {...props} />
      </MemoryRouter>,
    )
  }

  it('exibe o status inativo e não exibe o botão de reconfigurar quando o 2FA está desativado', () => {
    renderSettings({ twoFactorEnabled: false })

    expect(screen.getByText('Inativo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reconfigurar 2fa/i })).not.toBeInTheDocument()
  })

  it('exibe o status ativo e o botão Reconfigurar 2FA quando o usuário já possui 2FA ativo', () => {
    renderSettings({ twoFactorEnabled: true })

    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reconfigurar 2fa/i })).toBeInTheDocument()
  })

  it('ao clicar em Reconfigurar 2FA, transita para o Passo 1 (VERIFY_CURRENT) com showQrCode={false}', async () => {
    const user = userEvent.setup()
    renderSettings({ twoFactorEnabled: true })

    await user.click(screen.getByRole('button', { name: /reconfigurar 2fa/i }))

    // Passo 1 exibido
    expect(screen.getByText('Passo 1 de 3: Confirmar aparelho atual')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Digite o código de 6 dígitos do seu autenticador atual para autorizar a troca',
      ),
    ).toBeInTheDocument()

    // Não deve exibir a seção com o QR Code
    expect(
      screen.queryByRole('region', { name: 'Configuração do aplicativo autenticador' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Código de autenticação')).toBeInTheDocument()
  })

  it('no Passo 1, quando o código atual for inválido (backend retorna erro), exibe mensagem de erro e permanece no Passo 1', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorService.setup).mockRejectedValueOnce(
      new Error('Código do autenticador atual inválido ou expirado.'),
    )

    renderSettings({ twoFactorEnabled: true })
    await user.click(screen.getByRole('button', { name: /reconfigurar 2fa/i }))

    const input = screen.getByLabelText('Código de autenticação')
    await user.type(input, '000000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(twoFactorService.setup).toHaveBeenCalledWith('000000')
    expect(
      await screen.findByText('Código do autenticador atual inválido ou expirado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Passo 1 de 3: Confirmar aparelho atual')).toBeInTheDocument()
  })

  it('no Passo 1, quando o código atual for válido, transita para o Passo 2 (SCAN_NEW_QR) exibindo o novo QR Code', async () => {
    const user = userEvent.setup()
    vi.mocked(twoFactorService.setup).mockResolvedValueOnce({
      otpauthUri: 'otpauth://totp/V-Stable:arthur@empresa.com?secret=NEWSECRET789&issuer=V-Stable',
      secret: 'NEWSECRET789',
    })

    renderSettings({ twoFactorEnabled: true })
    await user.click(screen.getByRole('button', { name: /reconfigurar 2fa/i }))

    const input = screen.getByLabelText('Código de autenticação')
    await user.type(input, '123456')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(twoFactorService.setup).toHaveBeenCalledWith('123456')

    // Deve transitar para o Passo 2
    expect(await screen.findByText('Passo 2 de 3: Escanear novo QR Code')).toBeInTheDocument()
    expect(screen.getByText('Configurar Novo Aparelho')).toBeInTheDocument()

    // Agora showQrCode={true}: deve exibir o QR Code e o segredo
    expect(
      screen.getByRole('region', { name: 'Configuração do aplicativo autenticador' }),
    ).toBeInTheDocument()
    expect(screen.getByText('NEWSECRET789')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar e Ativar 2FA' })).toBeInTheDocument()
  })

  it('completa todo o fluxo até o Passo 3 (SHOW_RECOVERY_CODES) e retorna para IDLE após confirmação', async () => {
    const user = userEvent.setup()
    const onReconfigureSuccess = vi.fn()

    vi.mocked(twoFactorService.setup).mockResolvedValueOnce({
      otpauthUri: 'otpauth://totp/V-Stable:arthur@empresa.com?secret=NEWSECRET789&issuer=V-Stable',
      secret: 'NEWSECRET789',
    })

    const newRecoveryCodes = [
      'REC1-1111',
      'REC2-2222',
      'REC3-3333',
      'REC4-4444',
      'REC5-5555',
      'REC6-6666',
      'REC7-7777',
      'REC8-8888',
    ]

    vi.mocked(twoFactorService.activate).mockResolvedValueOnce({
      success: true,
      recoveryCodes: newRecoveryCodes,
    })

    renderSettings({ twoFactorEnabled: true, onReconfigureSuccess })

    // Inicia reconfiguração
    await user.click(screen.getByRole('button', { name: /reconfigurar 2fa/i }))

    // Passo 1: Digita código atual
    await user.type(screen.getByLabelText('Código de autenticação'), '123456')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Passo 2: Digita código do novo aparelho
    expect(await screen.findByText('Passo 2 de 3: Escanear novo QR Code')).toBeInTheDocument()
    const newInput = screen.getByLabelText('Código de autenticação')
    await user.type(newInput, '654321')
    await user.click(screen.getByRole('button', { name: 'Confirmar e Ativar 2FA' }))

    expect(twoFactorService.activate).toHaveBeenCalledWith('654321')

    // Passo 3: Exibe novos códigos de recuperação
    expect(
      await screen.findByText('Passo 3 de 3: Novos códigos de recuperação'),
    ).toBeInTheDocument()
    expect(screen.getByText('REC1-1111')).toBeInTheDocument()
    expect(screen.getByText('REC8-8888')).toBeInTheDocument()

    const completeBtn = screen.getByRole('button', { name: 'Concluir Configuração' })
    expect(completeBtn).toBeDisabled()

    // Marca o checkbox de confirmação
    await user.click(
      screen.getByLabelText('Confirmo que anotei ou salvei meus códigos em local seguro'),
    )
    expect(completeBtn).toBeEnabled()

    // Conclui
    await user.click(completeBtn)

    // Retorna para IDLE com mensagem de sucesso
    expect(await screen.findByRole('button', { name: /reconfigurar 2fa/i })).toBeInTheDocument()
    expect(
      screen.getByText('Autenticação em duas etapas reconfigurada com sucesso!'),
    ).toBeInTheDocument()
    expect(twoFactorService.setActivated).toHaveBeenCalledWith(true)
    expect(onReconfigureSuccess).toHaveBeenCalledTimes(1)
  })

  it('permite cancelar a reconfiguração voltando para o estado IDLE', async () => {
    const user = userEvent.setup()
    renderSettings({ twoFactorEnabled: true })

    await user.click(screen.getByRole('button', { name: /reconfigurar 2fa/i }))
    expect(screen.getByText('Passo 1 de 3: Confirmar aparelho atual')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: /reconfigurar 2fa/i })).toBeInTheDocument()
  })
})
