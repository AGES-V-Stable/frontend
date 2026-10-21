import { act, fireEvent, render, screen } from '@testing-library/react'
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
})
