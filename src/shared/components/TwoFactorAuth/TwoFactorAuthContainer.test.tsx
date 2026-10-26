import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TwoFactorAuthContainer } from './TwoFactorAuthContainer'

const sampleUri =
  'otpauth://totp/V-Stable:usuario@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=V-Stable'

describe('TwoFactorAuthContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renderiza o QR Code e as instruções de configuração quando otpauthUri é fornecido', () => {
    render(
      <TwoFactorAuthContainer
        otpauthUri={sampleUri}
        title="Configurar Autenticação de Dois Fatores"
        description="Proteja sua conta utilizando 2FA."
      />,
    )

    expect(screen.getByText('Configurar Autenticação de Dois Fatores')).toBeInTheDocument()
    expect(screen.getByText('Proteja sua conta utilizando 2FA.')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Configuração do aplicativo autenticador' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('QR Code para configuração de dois fatores')).toBeInTheDocument()
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar chave secreta' })).toBeInTheDocument()
  })

  it('oculta o QR Code e a chave manual quando showQrCode é falso mesmo com otpauthUri fornecido', () => {
    render(
      <TwoFactorAuthContainer
        otpauthUri={sampleUri}
        showQrCode={false}
        description="Digite o código de 6 dígitos do seu autenticador atual para autorizar a troca"
      />,
    )

    expect(
      screen.queryByRole('region', { name: 'Configuração do aplicativo autenticador' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('QR Code para configuração de dois fatores'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Digite o código de 6 dígitos do seu autenticador atual para autorizar a troca',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Código de autenticação')).toBeInTheDocument()
  })

  it('permite copiar o segredo para a área de transferência e exibe feedback de Copiado', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(<TwoFactorAuthContainer otpauthUri={sampleUri} />)

    const copyButton = screen.getByRole('button', { name: 'Copiar chave secreta' })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(writeTextMock).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP')
    expect(screen.getByText('✓ Copiado!')).toBeInTheDocument()

    // Após 2 segundos o texto volta ao normal
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Copiar')).toBeInTheDocument()
  })

  it('utiliza a prop secret explícita quando informada', () => {
    render(<TwoFactorAuthContainer otpauthUri={sampleUri} secret="CUSTOMSECRET123" />)

    expect(screen.getByText('CUSTOMSECRET123')).toBeInTheDocument()
  })

  it('extrai o segredo mesmo de uma URI com formato não padrão através do fallback de regex', () => {
    render(<TwoFactorAuthContainer otpauthUri="invalid-url-scheme:totp?secret=FALLBACKSECRET123" />)
    expect(screen.getByText('FALLBACKSECRET123')).toBeInTheDocument()
  })

  it('lida graciosamente com falha na área de transferência', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')),
      },
    })

    render(<TwoFactorAuthContainer otpauthUri={sampleUri} />)

    const copyButton = screen.getByRole('button', { name: 'Copiar chave secreta' })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(screen.queryByText('✓ Copiado!')).not.toBeInTheDocument()
  })

  it('oculta a seção do QR Code quando otpauthUri não é fornecido', () => {
    render(<TwoFactorAuthContainer />)

    expect(
      screen.queryByRole('region', { name: 'Configuração do aplicativo autenticador' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('QR Code para configuração de dois fatores'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Verificação do código de 6 dígitos' }),
    ).toBeInTheDocument()
  })

  it('filtra caracteres não numéricos e limita a 6 dígitos', () => {
    const handleChange = vi.fn()
    render(<TwoFactorAuthContainer onChange={handleChange} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: 'ab123c456789' } })

    expect(handleChange).toHaveBeenCalledWith('123456')
    expect(input).toHaveValue('123456')
  })

  it('aceita colar o código completo, inclusive com o espaço dos apps autenticadores', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const handleVerify = vi.fn()
    render(<TwoFactorAuthContainer onVerify={handleVerify} />)

    await user.click(screen.getByPlaceholderText('000000'))
    await user.paste('123 456')

    expect(screen.getByPlaceholderText('000000')).toHaveValue('123456')
    await user.click(screen.getByRole('button', { name: 'Verificar código' }))
    expect(handleVerify).toHaveBeenCalledWith('123456')
  })

  it('apaga dígitos com Backspace e volta a bloquear o envio', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<TwoFactorAuthContainer />)
    const input = screen.getByPlaceholderText('000000')

    await user.type(input, '123456')
    expect(screen.getByRole('button', { name: 'Verificar código' })).toBeEnabled()
    await user.keyboard('{Backspace}')

    expect(input).toHaveValue('12345')
    expect(screen.getByRole('button', { name: 'Verificar código' })).toBeDisabled()
  })

  it('mantém o botão de submit desabilitado até que 6 dígitos sejam digitados', () => {
    render(<TwoFactorAuthContainer />)

    const submitButton = screen.getByRole('button', { name: 'Verificar código' })
    expect(submitButton).toBeDisabled()

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '12345' } })
    expect(submitButton).toBeDisabled()

    fireEvent.change(input, { target: { value: '123456' } })
    expect(submitButton).toBeEnabled()
  })

  it('dispara onVerify com o código ao clicar no botão de submissão', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuthContainer onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '654321' } })

    const submitButton = screen.getByRole('button', { name: 'Verificar código' })
    fireEvent.click(submitButton)

    expect(handleVerify).toHaveBeenCalledWith('654321')
  })

  it('dispara onVerify ao pressionar Enter com 6 dígitos preenchidos', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuthContainer onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleVerify).toHaveBeenCalledWith('123456')
  })

  it('não dispara onVerify ao pressionar Enter com menos de 6 dígitos', () => {
    const handleVerify = vi.fn()
    render(<TwoFactorAuthContainer onVerify={handleVerify} />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '123' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleVerify).not.toHaveBeenCalled()
  })

  it('exibe mensagem de erro e marca aria-invalid quando a prop error é fornecida', () => {
    render(<TwoFactorAuthContainer error="Código inválido ou expirado." />)

    const input = screen.getByPlaceholderText('000000')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou expirado.')
  })

  it('exibe estado de loading e desabilita input e botão quando loading={true}', () => {
    render(<TwoFactorAuthContainer value="123456" loading />)

    const input = screen.getByPlaceholderText('000000')
    const button = screen.getByRole('button', { name: 'Verificando...' })

    expect(input).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('renderiza label personalizado no botão via submitLabel', () => {
    render(<TwoFactorAuthContainer value="123456" submitLabel="Ativar 2FA" />)

    expect(screen.getByRole('button', { name: 'Ativar 2FA' })).toBeInTheDocument()
  })

  it('renderiza o timer de 30 segundos sincronizado e altera a cor para alerta nos últimos 5 segundos', () => {
    // 1700000000 s % 30 = 20 -> 30 - 20 = 10 s restantes
    vi.setSystemTime(new Date(1700000000 * 1000))

    render(<TwoFactorAuthContainer />)

    const timer = screen.getByRole('timer')
    expect(timer).toBeInTheDocument()
    expect(screen.getByText('10s')).toBeInTheDocument()

    const progressBar = screen.getByTestId('totp-timer-progress')
    expect(progressBar).toHaveClass('bg-primary')

    // Avança 5 segundos no relógio: 10s - 5s = 5s restantes (alerta)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText('5s')).toBeInTheDocument()
    expect(screen.getByText('Código expirando...')).toBeInTheDocument()
    expect(progressBar).toHaveClass('bg-red-600')
  })

  it('exibe o botão de recuperação por padrão quando não está em modo QR Code', () => {
    render(<TwoFactorAuthContainer />)

    expect(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    ).toBeInTheDocument()
  })

  it('não exibe o botão de recuperação no modo de setup com QR Code por padrão, a menos que allowRecovery seja true', () => {
    const { unmount } = render(<TwoFactorAuthContainer otpauthUri={sampleUri} />)

    expect(
      screen.queryByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    ).not.toBeInTheDocument()

    unmount()

    render(<TwoFactorAuthContainer otpauthUri={sampleUri} allowRecovery />)
    expect(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    ).toBeInTheDocument()
  })

  it('alterna para o modo de recuperação ao clicar no botão, ocultando o timer e o input de 6 dígitos', () => {
    render(<TwoFactorAuthContainer />)

    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()

    const recoveryLink = screen.getByRole('button', {
      name: 'Perdi meu celular / Usar código de recuperação',
    })
    fireEvent.click(recoveryLink)

    expect(screen.queryByPlaceholderText('000000')).not.toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByTestId('recovery-code-input')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Voltar para código do autenticador' }),
    ).toBeInTheDocument()
  })

  it('formata para maiúsculo e dispara onVerifyRecovery com o código ao submeter', () => {
    const handleVerifyRecovery = vi.fn()
    render(<TwoFactorAuthContainer onVerifyRecovery={handleVerifyRecovery} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    const recoveryInput = screen.getByTestId('recovery-code-input')
    const submitBtn = screen.getByRole('button', { name: 'Verificar código de recuperação' })

    // Menos de 8 caracteres mantém desabilitado
    fireEvent.change(recoveryInput, { target: { value: 'abc-12' } })
    expect(submitBtn).toBeDisabled()

    // 8 ou mais caracteres alfanuméricos com hífens habilita
    fireEvent.change(recoveryInput, { target: { value: 'abcd-1234' } })
    expect(recoveryInput).toHaveValue('ABCD-1234')
    expect(submitBtn).toBeEnabled()

    fireEvent.click(submitBtn)
    expect(handleVerifyRecovery).toHaveBeenCalledWith('ABCD-1234')
  })

  it('dispara onVerifyRecovery ao pressionar Enter com código de recuperação válido', () => {
    const handleVerifyRecovery = vi.fn()
    render(<TwoFactorAuthContainer onVerifyRecovery={handleVerifyRecovery} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    const recoveryInput = screen.getByTestId('recovery-code-input')
    fireEvent.change(recoveryInput, { target: { value: 'emerg-123' } })
    fireEvent.keyDown(recoveryInput, { key: 'Enter' })

    expect(handleVerifyRecovery).toHaveBeenCalledWith('EMERG-123')
  })

  it('oculta título e descrição principais ao entrar no modo de recuperação', () => {
    render(
      <TwoFactorAuthContainer
        title="Autenticação em duas etapas"
        description="Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador para acessar a conta."
      />,
    )

    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador para acessar a conta.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    expect(screen.queryByText('Autenticação em duas etapas')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador para acessar a conta.',
      ),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Código de recuperação de emergência')).toBeInTheDocument()
  })

  it('notifica onRecoveryModeChange ao alternar entre os modos', () => {
    const handleModeChange = vi.fn()
    render(<TwoFactorAuthContainer onRecoveryModeChange={handleModeChange} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )
    expect(handleModeChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para código do autenticador' }))
    expect(handleModeChange).toHaveBeenCalledWith(false)
  })

  it('limita o campo de código de recuperação a 8 caracteres alfanuméricos', () => {
    render(<TwoFactorAuthContainer />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    const input = screen.getByTestId('recovery-code-input')
    fireEvent.change(input, { target: { value: 'abcdefghijk123' } })

    expect(input).toHaveValue('ABCDEFGH')
  })

  it('permite retornar do modo de recuperação para o modo TOTP de 6 dígitos', () => {
    render(<TwoFactorAuthContainer />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    expect(screen.getByTestId('recovery-code-input')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para código do autenticador' }))

    expect(screen.queryByTestId('recovery-code-input')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })

  it('renderiza botão de voltar e dispara onBack quando a prop é fornecida', () => {
    const handleBack = vi.fn()
    render(<TwoFactorAuthContainer onBack={handleBack} backLabel="Etapa anterior" />)

    const backBtn = screen.getByRole('button', { name: 'Etapa anterior' })
    expect(backBtn).toBeInTheDocument()

    fireEvent.click(backBtn)
    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it('exibe loadingLabel no botão de submit durante o processamento', () => {
    render(<TwoFactorAuthContainer loading loadingLabel="Processando..." onBack={() => {}} />)

    expect(screen.getByRole('button', { name: 'Processando...' })).toBeInTheDocument()
  })

  it('renderiza botão de voltar também no modo de recuperação quando onBack é fornecido', () => {
    const handleBack = vi.fn()
    render(<TwoFactorAuthContainer onBack={handleBack} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Perdi meu celular / Usar código de recuperação' }),
    )

    const backBtn = screen.getByRole('button', { name: 'Voltar' })
    expect(backBtn).toBeInTheDocument()

    fireEvent.click(backBtn)
    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})
