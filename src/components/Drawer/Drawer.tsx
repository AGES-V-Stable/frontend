import React from 'react'
import { Button, type ButtonProps } from '../Button'

export interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: ButtonProps[]
}

export const Drawer = ({ open, title, onClose, children, actions = [] }: DrawerProps) => {
  if (!open) return null

  return (
    <div
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
        className="
          absolute right-0 top-0
          flex h-full w-full max-w-[480px]
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

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="
              flex h-[40px] w-[40px]
              cursor-pointer
              items-center justify-center
              rounded-[8px]
              text-[24px]
              text-gray-500
              transition-colors
              hover:bg-gray-100
              hover:text-gray-900
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#059669]
              focus-visible:ring-offset-2
            "
          >
            ×
          </button>
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
              gap-[12px]
              border-t border-gray-200
              px-[24px] py-[20px]
            "
          >
            {actions.map((action, index) => (
              <Button key={index} {...action} className={`flex-1 ${action.className ?? ''}`} />
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
