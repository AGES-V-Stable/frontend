import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendSupportChatMessage } from '../api/supportChat'
import { SupportChatWidget } from './SupportChatWidget'

vi.mock('../api/supportChat', () => ({
  sendSupportChatMessage: vi.fn(),
}))

describe('SupportChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens and closes via floating button and Escape key', async () => {
    const user = userEvent.setup()
    render(<SupportChatWidget />)

    const toggleBtn = screen.getByRole('button', { name: 'Abrir suporte IA' })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggleBtn)
    expect(
      screen.getByRole('region', { name: 'Assistente de Suporte V-Stable' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar suporte IA' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('region', { name: 'Assistente de Suporte V-Stable' }),
    ).not.toBeInTheDocument()
  })

  it('sends a message via form input, renders formatted reply safely without XSS, and clears chat', async () => {
    const user = userEvent.setup()
    vi.mocked(sendSupportChatMessage).mockResolvedValueOnce({
      reply:
        'Use **Wallet Cripto** com `USDC` na rede Polygon.\n<script>window.__xss = true</script>',
      provider: 'gemini',
      suggestedQuestions: ['Nova pergunta sugerida?'],
      timestamp: '2026-11-09T18:00:00Z',
    })

    render(<SupportChatWidget open={true} />)

    const input = screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')
    await user.type(input, 'Como enviar para a Colômbia?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(sendSupportChatMessage).toHaveBeenCalledWith({
      message: 'Como enviar para a Colômbia?',
      history: [],
    })

    expect(await screen.findByText('Wallet Cripto')).toBeInTheDocument()
    expect(screen.getByText('USDC')).toBeInTheDocument()
    expect(screen.getByText('<script>window.__xss = true</script>')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(screen.queryByText('Como enviar para a Colômbia?')).not.toBeInTheDocument()
  })

  it('sends a suggested question when clicking a quick question chip', async () => {
    const user = userEvent.setup()
    vi.mocked(sendSupportChatMessage).mockResolvedValueOnce({
      reply: 'A V-Stable integra Avenia e BlindPay.',
      provider: 'vstable-assistant',
      suggestedQuestions: [],
      timestamp: '2026-11-09T18:00:00Z',
    })

    render(<SupportChatWidget open={true} />)

    await user.click(
      screen.getByRole('button', { name: 'Como funciona a integração com Avenia e BlindPay?' }),
    )

    expect(sendSupportChatMessage).toHaveBeenCalledWith({
      message: 'Como funciona a integração com Avenia e BlindPay?',
      history: [],
    })
    expect(await screen.findByText('A V-Stable integra Avenia e BlindPay.')).toBeInTheDocument()
  })

  it('displays an alert when the API returns an error', async () => {
    const user = userEvent.setup()
    vi.mocked(sendSupportChatMessage).mockRejectedValueOnce(
      new Error(
        'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
      ),
    )

    render(<SupportChatWidget open={true} />)

    const input = screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')
    await user.type(input, 'Teste rate limit')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
    )
  })
})
