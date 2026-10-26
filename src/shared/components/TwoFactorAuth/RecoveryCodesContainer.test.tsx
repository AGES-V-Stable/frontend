import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryCodesContainer } from './RecoveryCodesContainer'

describe('RecoveryCodesContainer', () => {
  const sampleCodes = [
    'ABCD-1234',
    'EFGH-5678',
    'IJKL-9012',
    'MNOP-3456',
    'QRST-7890',
    'UVWX-1234',
    'YZAB-5678',
    'CDEF-9012',
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza os 8 códigos, aviso de segurança e descrição', () => {
    render(<RecoveryCodesContainer codes={sampleCodes} onComplete={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: 'Códigos de recuperação de emergência' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/uma única vez/i)

    // Todos os 8 códigos devem estar renderizados
    sampleCodes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument()
    })
  })

  it('mantém o botão "Concluir Configuração" desabilitado até que o checkbox seja marcado', async () => {
    const user = userEvent.setup()
    const handleComplete = vi.fn()
    render(<RecoveryCodesContainer codes={sampleCodes} onComplete={handleComplete} />)

    const completeBtn = screen.getByRole('button', { name: 'Concluir Configuração' })
    const checkbox = screen.getByLabelText(
      'Confirmo que anotei ou salvei meus códigos em local seguro',
    )

    // Inicialmente desabilitado
    expect(completeBtn).toBeDisabled()
    expect(checkbox).not.toBeChecked()

    // Clica no botão enquanto desabilitado -> onComplete não dispara
    await user.click(completeBtn)
    expect(handleComplete).not.toHaveBeenCalled()

    // Marca o checkbox -> botão fica habilitado
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(completeBtn).toBeEnabled()

    // Clica para concluir -> onComplete dispara
    await user.click(completeBtn)
    expect(handleComplete).toHaveBeenCalledTimes(1)

    // Se desmarcar, volta a ficar desabilitado
    await user.click(checkbox)
    expect(completeBtn).toBeDisabled()
  })

  it('copia todos os códigos para a área de transferência e exibe feedback de "Copiado!"', async () => {
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock)

    render(<RecoveryCodesContainer codes={sampleCodes} onComplete={vi.fn()} />)

    const copyBtn = screen.getByRole('button', { name: /copiar códigos/i })
    expect(copyBtn).toHaveTextContent('Copiar códigos')

    await user.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith(sampleCodes.join('\n'))
    expect(await screen.findByText('Copiado!')).toBeInTheDocument()
  })

  it('gera e aciona o download do arquivo .txt com os códigos', async () => {
    const user = userEvent.setup()

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    globalThis.URL.createObjectURL = createObjectURLMock
    globalThis.URL.revokeObjectURL = revokeObjectURLMock

    render(<RecoveryCodesContainer codes={sampleCodes} onComplete={vi.fn()} />)

    const downloadBtn = screen.getByRole('button', { name: /baixar códigos/i })
    await user.click(downloadBtn)

    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Baixado!')).toBeInTheDocument()
  })
})
