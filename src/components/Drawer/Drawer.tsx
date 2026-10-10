import React, { useEffect, useRef } from 'react'
import { Button, type ButtonProps } from '../Button'

export interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: ButtonProps[]
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Drawer = ({ open, title, onClose, children, actions = [] }: DrawerProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  // Mantém o último onClose sem religar os listeners a cada render do pai.
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement

      // O foco nunca sai do painel enquanto ele está aberto.
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialogRef.current?.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fechar drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="
          absolute right-0 top-0
          flex h-full w-full max-w-[480px] focus:outline-none
          flex-col
          bg-white
          shadow-[-4px_0px_12px_rgba(0,0,0,0.08)]
        "
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between
            border-b border-gray-200
            px-[24px] py-[20px]
          "
        >
          <h2 id="drawer-title" className="text-[20px] font-semibold text-gray-900">
            {title}
          </h2>

          <Button
            type="button"
            variant="secondary"
            label="Fechar"
            onClick={onClose}
            className="!w-auto"
          />
        </div>

        {/* Content */}
        <div
          className="
            flex-1
            overflow-y-auto
            px-[24px] py-[24px]
          "
        >
          {children}
        </div>

        {/* Footer */}
        {actions.length > 0 && (
          <div
            className="
              flex
              justify-end
              gap-[12px]
              border-t border-gray-200
              px-[24px] py-[20px]
            "
          >
            {actions.map((action, index) => (
              <Button key={index} {...action} className={`!w-auto ${action.className ?? ''}`} />
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
