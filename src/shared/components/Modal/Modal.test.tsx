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

  it('given two stacked modals, then Escape closes only the one on top', async () => {
    const closeBottom = vi.fn()
    const closeTop = vi.fn()
    render(
      <>
        <Modal labelledBy="bottom" onClose={closeBottom}>
          <h2 id="bottom">Formulário</h2>
          <button type="button">Campo de baixo</button>
        </Modal>
        <Modal labelledBy="top" onClose={closeTop}>
          <h2 id="top">Aviso</h2>
          <button type="button">Ok</button>
        </Modal>
      </>,
    )

    await userEvent.keyboard('{Escape}')

    expect(closeTop).toHaveBeenCalledTimes(1)
    expect(closeBottom).not.toHaveBeenCalled()
  })

  it('given the focus outside the panel, then Tab brings it back to the first field', async () => {
    render(
      <>
        <button type="button">Fora</button>
        <Modal labelledBy="t" onClose={vi.fn()}>
          <h2 id="t">Título</h2>
          <button type="button">Primeiro</button>
          <button type="button">Último</button>
        </Modal>
      </>,
    )
    screen.getByRole('button', { name: 'Fora' }).focus()

    await userEvent.tab()

    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus()
  })

  it('skips fields of a disabled fieldset and keeps the focus on the panel when nothing is enabled', async () => {
    render(
      <>
        <button type="button">Fora</button>
        <Modal labelledBy="t" busy onClose={vi.fn()}>
          <h2 id="t">Título</h2>
          <fieldset disabled>
            <input type="radio" aria-label="Operador" />
          </fieldset>
          <button type="button" disabled>
            Criar convite
          </button>
        </Modal>
      </>,
    )
    screen.getByRole('button', { name: 'Fora' }).focus()

    await userEvent.tab()

    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})
