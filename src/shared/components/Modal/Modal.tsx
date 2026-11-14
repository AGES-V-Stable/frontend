import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Modais abertos, do mais antigo ao mais recente: só o do topo responde ao teclado. */
const openModals: symbol[] = []

/** Campos dentro de um fieldset desabilitado casam com o seletor, mas não recebem foco. */
function focusableIn(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return []
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest('fieldset:disabled'),
  )
}

export interface ModalProps {
  /** Id do título que nomeia o diálogo. */
  labelledBy: string
  describedBy?: string
  /** Enquanto uma ação está em andamento, Escape e o fundo não fecham o diálogo. */
  busy?: boolean
  /** Quando muda (por exemplo, uma nova etapa), o foco volta para o painel se tiver saído dele. */
  focusKey?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Diálogo modal centralizado: mantém o foco dentro do painel, fecha com Escape ou clique no
 * fundo e, ao desmontar, devolve o foco para o elemento que o abriu.
 */
export function Modal({
  labelledBy,
  describedBy,
  busy = false,
  focusKey,
  onClose,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const requestClose = () => {
    if (!busy) onClose()
  }
  const closeRef = useRef(requestClose)
  useEffect(() => {
    closeRef.current = requestClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const id = Symbol('modal')
    openModals.push(id)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Com modais empilhados, Escape e Tab pertencem só ao de cima.
      if (openModals[openModals.length - 1] !== id) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      const focusable = focusableIn(panel)
      const active = document.activeElement
      if (!focusable.length) {
        // Tudo desabilitado (ação em andamento): o foco fica no próprio painel.
        event.preventDefault()
        panel?.focus()
        return
      }
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (!panel?.contains(active)) {
        // O foco saiu do painel (ex.: o botão focado ficou desabilitado): volta para dentro.
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      openModals.splice(openModals.indexOf(id), 1)
      previouslyFocused?.focus?.()
    }
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
  }, [focusKey])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={requestClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={busy}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto rounded-xl bg-white p-6 shadow-lg focus:outline-none"
      >
        {children}
      </section>
    </div>
  )
}
