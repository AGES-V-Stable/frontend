import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupportChatRateLimitError, sendSupportChatMessage } from '../api/supportChat'
import type { SupportChatResponse } from '../api/supportChat'
import { SupportChatWidget } from './SupportChatWidget'

vi.mock('../api/supportChat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/supportChat')>()
  return {
    ...actual,
    sendSupportChatMessage: vi.fn(),
  }
})

describe('SupportChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rises above a side panel footer while one is open, and returns when it closes', () => {
    // Given o botão de suporte na página
    render(<SupportChatWidget />)
    const widget = screen.getByTestId('support-chat-widget')

    // Then ele fica a 24px da borda e só sobe quando existe um rodapé de painel lateral na página
    expect(widget).toHaveClass('bottom-6', '[body:has([data-drawer-footer])_&]:bottom-28')
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

    expect(sendSupportChatMessage).toHaveBeenCalledWith(
      {
        message: 'Como enviar para a Colômbia?',
        history: [],
      },
      expect.any(AbortSignal),
    )

    expect(await screen.findByText('Wallet Cripto')).toBeInTheDocument()
    expect(screen.getByText('USDC')).toBeInTheDocument()
    expect(screen.getByText('<script>window.__xss = true</script>')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(screen.queryByText('Como enviar para a Colômbia?')).not.toBeInTheDocument()
  })

  it('sends a suggested question when clicking a quick question chip', async () => {
    const user = userEvent.setup()
    vi.mocked(sendSupportChatMessage).mockResolvedValueOnce({
      reply: 'A empresa conta com representante e membros com permissões configuradas.',
      provider: 'vstable-assistant',
      suggestedQuestions: [],
      timestamp: '2026-11-09T18:00:00Z',
    })

    render(<SupportChatWidget open={true} />)

    await user.click(
      screen.getByRole('button', {
        name: 'Como funcionam o representante e os membros da empresa?',
      }),
    )

    expect(sendSupportChatMessage).toHaveBeenCalledWith(
      {
        message: 'Como funcionam o representante e os membros da empresa?',
        history: [],
      },
      expect.any(AbortSignal),
    )
    expect(
      await screen.findByText(
        'A empresa conta com representante e membros com permissões configuradas.',
      ),
    ).toBeInTheDocument()
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

  it('limits the panel width to the viewport on narrow screens', () => {
    render(<SupportChatWidget open={true} />)
    expect(screen.getByRole('region', { name: 'Assistente de Suporte V-Stable' })).toHaveClass(
      'w-[calc(100vw-3rem)]',
      'max-w-[410px]',
    )
    expect(screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')).toHaveClass(
      'min-w-0',
    )
  })

  it('discards a pending reply after clearing and allows a new conversation', async () => {
    const user = userEvent.setup()
    let resolveFirst: (value: SupportChatResponse) => void = () => {}
    vi.mocked(sendSupportChatMessage).mockImplementationOnce(
      () =>
        new Promise<SupportChatResponse>((resolve) => {
          resolveFirst = resolve
        }),
    )
    vi.mocked(sendSupportChatMessage).mockResolvedValueOnce({
      reply: 'Resposta nova',
      provider: 'gemini',
      suggestedQuestions: [],
      timestamp: '2026-11-09T18:00:00Z',
    })

    render(<SupportChatWidget open={true} />)
    const input = screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')
    await user.type(input, 'Pergunta antiga')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    const originalSignal = vi.mocked(sendSupportChatMessage).mock.calls[0][1]

    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(originalSignal?.aborted).toBe(true)
    expect(screen.queryByText('Pergunta antiga')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Como funcionam o representante e os membros da empresa?',
      }),
    )
    expect(await screen.findByText('Resposta nova')).toBeInTheDocument()

    await act(async () => {
      resolveFirst({
        reply: 'Resposta antiga',
        provider: 'gemini',
        suggestedQuestions: [],
        timestamp: '2026-11-09T18:00:00Z',
      })
    })
    expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument()
    expect(screen.getByText('Resposta nova')).toBeInTheDocument()
  })

  it('shows a countdown timer near Enviar on SupportChatRateLimitError and re-enables sending after cooldown', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(sendSupportChatMessage)
        .mockRejectedValueOnce(
          new SupportChatRateLimitError(
            'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
            12,
          ),
        )
        .mockResolvedValueOnce({
          reply: 'Resposta após cooldown.',
          provider: 'gemini',
          suggestedQuestions: [],
          timestamp: '2026-11-16T18:00:00Z',
        })

      render(<SupportChatWidget open={true} />)

      const input = screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')
      const sendButton = screen.getByRole('button', { name: 'Enviar' })

      fireEvent.change(input, { target: { value: 'Primeira tentativa' } })
      await act(async () => {
        fireEvent.click(sendButton)
      })

      const timer = screen.getByTestId('support-chat-cooldown-timer')
      expect(timer).toHaveTextContent('12s')
      expect(timer).toHaveAttribute('role', 'timer')
      expect(timer).toHaveAttribute('aria-live', 'polite')
      expect(timer).toHaveAttribute('title', 'Tempo restante para enviar nova mensagem')
      expect(
        screen.getByRole('button', {
          name: 'Como funcionam o representante e os membros da empresa?',
        }),
      ).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
      )

      fireEvent.change(input, { target: { value: 'Nova pergunta' } })
      expect(sendButton).toBeDisabled()

      act(() => {
        vi.advanceTimersByTime(5_000)
      })
      expect(screen.getByTestId('support-chat-cooldown-timer')).toHaveTextContent('7s')
      expect(sendButton).toBeDisabled()

      act(() => {
        vi.advanceTimersByTime(7_000)
      })
      expect(screen.queryByTestId('support-chat-cooldown-timer')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(sendButton).toBeEnabled()

      await act(async () => {
        fireEvent.click(sendButton)
      })
      expect(sendSupportChatMessage).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Resposta após cooldown.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('blocks the 16th message within 1 minute client-side and displays the cooldown timer without calling the API', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-11-16T12:00:00Z'))
      vi.mocked(sendSupportChatMessage).mockResolvedValue({
        reply: 'Ok',
        provider: 'gemini',
        suggestedQuestions: [],
        timestamp: '2026-11-16T12:00:00Z',
      })

      render(<SupportChatWidget open={true} />)

      const input = screen.getByPlaceholderText('Digite sua dúvida sobre a V-Stable...')
      const sendButton = screen.getByRole('button', { name: 'Enviar' })

      for (let i = 1; i <= 15; i += 1) {
        fireEvent.change(input, { target: { value: `Pergunta ${i}` } })
        await act(async () => {
          fireEvent.click(sendButton)
        })
      }

      expect(sendSupportChatMessage).toHaveBeenCalledTimes(15)
      expect(screen.queryByTestId('support-chat-cooldown-timer')).not.toBeInTheDocument()

      fireEvent.change(input, { target: { value: 'Pergunta 16' } })
      await act(async () => {
        fireEvent.click(sendButton)
      })

      expect(sendSupportChatMessage).toHaveBeenCalledTimes(15)
      const timer = screen.getByTestId('support-chat-cooldown-timer')
      expect(timer).toHaveTextContent('60s')
      expect(sendButton).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Muitas mensagens enviadas em sequência. Aguarde alguns segundos e tente novamente.',
      )
      expect(input).toHaveValue('Pergunta 16')

      act(() => {
        vi.advanceTimersByTime(60_000)
      })
      expect(screen.queryByTestId('support-chat-cooldown-timer')).not.toBeInTheDocument()
      expect(sendButton).toBeEnabled()

      await act(async () => {
        fireEvent.click(sendButton)
      })
      expect(sendSupportChatMessage).toHaveBeenCalledTimes(16)
    } finally {
      vi.useRealTimers()
    }
  })
})
