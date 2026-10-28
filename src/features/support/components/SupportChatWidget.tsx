import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { sendSupportChatMessage } from '../api/supportChat'
import type { SupportChatMessage } from '../api/supportChat'

const INITIAL_SUGGESTIONS = [
  'Por que não consigo fazer transações com a Colômbia?',
  'Como ativar ou reconfigurar meu QR Code de 2FA?',
  'Quais moedas e redes blockchain a V-Stable aceita?',
  'Por que minha conta ainda não pode fazer transferências?',
]

const WELCOME_MESSAGE: SupportChatMessage = {
  role: 'assistant',
  content:
    'Olá! Sou o **Assistente Virtual da V-Stable**. Posso tirar dúvidas sobre países e moedas suportadas (como Colômbia/SWIFT vs. Wallet Cripto), configuração de 2FA, cotações e compliance KYB/AML. Como posso ajudar?',
}

export interface SupportChatWidgetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function renderFormattedText(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return <div key={lineIdx} className="h-2" />
    }
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return (
      <p key={lineIdx} className="leading-relaxed">
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            )
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code
                key={partIdx}
                className="rounded bg-emerald-50 px-1 py-0.5 font-mono text-xs font-medium text-emerald-700"
              >
                {part.slice(1, -1)}
              </code>
            )
          }
          return part
        })}
      </p>
    )
  })
}

export function SupportChatWidget({ open: controlledOpen, onOpenChange }: SupportChatWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen

  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const [messages, setMessages] = useState<SupportChatMessage[]>([WELCOME_MESSAGE])
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, messages, loading])

  async function handleSendMessage(rawText: string) {
    const trimmed = rawText.trim()
    if (!trimmed || loading) return

    const userMessage: SupportChatMessage = { role: 'user', content: trimmed }
    const historyForRequest = messages.slice(-8)

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const response = await sendSupportChatMessage({
        message: trimmed,
        history: historyForRequest,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
        },
      ])
      if (response.suggestedQuestions?.length) {
        setSuggestions(response.suggestedQuestions)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível obter resposta do assistente no momento.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void handleSendMessage(input)
  }

  function handleClearChat() {
    setMessages([WELCOME_MESSAGE])
    setError(null)
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      {isOpen && (
        <section
          aria-label="Assistente de Suporte V-Stable"
          className="mb-4 flex h-[540px] max-h-[calc(100dvh-110px)] w-[360px] flex-col overflow-hidden rounded-2xl border border-sage-300 bg-white shadow-2xl sm:w-[410px]"
        >
          {/* Header */}
          <header className="flex items-center justify-between bg-primary px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
              >
                AI
              </span>
              <div>
                <h2 className="text-sm font-bold leading-tight">Assistente V-Stable</h2>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-50">
                  <span className="inline-block size-2 rounded-full bg-emerald-300" />
                  Suporte inteligente • Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reiniciar conversa"
                className=" cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-emerald-50 transition-colors hover:bg-white/15"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar chat de suporte"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-100/70 p-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user'
              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                      isUser
                        ? 'rounded-br-xs bg-primary text-white'
                        : 'rounded-bl-xs border border-sage-200 bg-white text-slate-800'
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div
                  role="status"
                  className="rounded-2xl rounded-bl-xs border border-sage-200 bg-white px-3.5 py-2.5 text-xs text-slate-500"
                >
                  Analisando sua dúvida...
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-600/30 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {error}
              </p>
            )}

            {/* Quick question chips */}
            {messages.length <= 2 && !loading && (
              <div className="pt-1">
                <p className="mb-2 text-[11px] font-semibold text-slate-500">
                  Perguntas frequentes:
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void handleSendMessage(question)}
                      className="cursor-pointer rounded-xl border border-sage-300 bg-white px-3 py-2 text-left text-xs font-medium text-emerald-700 transition-colors hover:border-primary hover:bg-emerald-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 border-t border-sage-200 bg-white p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Digite sua dúvida sobre a V-Stable..."
              disabled={loading}
              className="h-10 flex-1 rounded-xl border border-sage-300 bg-surface px-3 text-xs text-slate-900 placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* Floating Action Button (Bottom-Right) */}
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Fechar suporte IA' : 'Abrir suporte IA'}
        className="flex h-13 cursor-pointer items-center gap-2.5 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold"
        >
          ?
        </span>
        <span>{isOpen ? 'Fechar suporte' : 'Suporte IA'}</span>
      </button>
    </div>
  )
}
