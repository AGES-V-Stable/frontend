import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function Harness({ busy = false, onClose = vi.fn() }: { busy?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('one')
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open && (
        <Modal
          labelledBy="title"
          describedBy="description"
          busy={busy}
          focusKey={step}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        >
          <h2 id="title">Título</h2>
          <p id="description">Descrição</p>
          {step === 'one' ? (
            <button type="button" onClick={() => setStep('two')}>
              Avançar
            </button>
          ) : (
            <input aria-label="Campo" />
          )}
          <button type="button">Último</button>
        </Modal>
      )}
    </>
  )
}

describe('Modal', () => {
  it('opens as a named modal dialog with the focus on the panel', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialog = screen.getByRole('dialog', { name: 'Título' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Descrição')
    expect(dialog).toHaveFocus()
  })

  it('closes with Escape and returns the focus to the trigger', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })

  it('closes from the overlay', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('given an action in progress, then neither Escape nor the overlay close it', async () => {
    const onClose = vi.fn()
    render(<Harness busy onClose={onClose} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
  })

  it('keeps the focus inside the panel while tabbing in both directions', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const first = screen.getByRole('button', { name: 'Avançar' })
    const last = screen.getByRole('button', { name: 'Último' })

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('given a new step, when the focused element disappears, then the focus returns to the panel', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    await user.click(screen.getByRole('button', { name: 'Avançar' }))

    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})
