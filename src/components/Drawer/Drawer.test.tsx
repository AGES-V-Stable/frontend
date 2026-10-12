import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('does not render when closed', () => {
    render(
      <Drawer open={false} title="Test Drawer" onClose={vi.fn()}>
        <p>Drawer content</p>
      </Drawer>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <Drawer open={true} title="Test Drawer" onClose={vi.fn()}>
        <p>Drawer content</p>
      </Drawer>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Test Drawer' })).toBeInTheDocument()
    expect(screen.getByText('Drawer content')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Drawer open={true} title="Test Drawer" onClose={onClose}>
        <p>Drawer content</p>
      </Drawer>,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the overlay is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Drawer open={true} title="Test Drawer" onClose={onClose}>
        <p>Drawer content</p>
      </Drawer>,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar drawer' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders actions when provided', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(
      <Drawer
        open={true}
        title="Test Drawer"
        onClose={vi.fn()}
        actions={[
          {
            label: 'Cancelar',
            variant: 'secondary',
            onClick: onCancel,
          },
          {
            label: 'Salvar',
            variant: 'primary',
            onClick: onSave,
          },
        ]}
      >
        <p>Content</p>
      </Drawer>,
    )

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('does not render the footer when there are no actions', () => {
    render(
      <Drawer open={true} title="Test Drawer" onClose={vi.fn()}>
        <p>Content</p>
      </Drawer>,
    )

    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })

  it('calls an action onClick when its button is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <Drawer
        open={true}
        title="Test Drawer"
        onClose={vi.fn()}
        actions={[
          {
            label: 'Salvar',
            variant: 'primary',
            onClick: onSave,
          },
        ]}
      >
        <p>Content</p>
      </Drawer>,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('closes with the Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Drawer open={true} title="Test Drawer" onClose={onClose}>
        <p>Drawer content</p>
      </Drawer>,
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not react to Escape while closed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Drawer open={false} title="Test Drawer" onClose={onClose}>
        <p>Drawer content</p>
      </Drawer>,
    )

    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves the focus into the drawer when it opens and gives it back when it closes', async () => {
    const user = userEvent.setup()

    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <Drawer open={open} title="Test Drawer" onClose={() => setOpen(false)}>
            <p>Drawer content</p>
          </Drawer>
        </>
      )
    }

    render(<Host />)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    await user.click(opener)

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('keeps Tab and Shift+Tab inside the drawer', async () => {
    const user = userEvent.setup()

    render(
      <>
        <button type="button">Fora</button>
        <Drawer
          open={true}
          title="Test Drawer"
          onClose={vi.fn()}
          actions={[{ label: 'Salvar', onClick: vi.fn() }]}
        >
          <p>Drawer content</p>
        </Drawer>
      </>,
    )

    const dialog = screen.getByRole('dialog')
    const save = screen.getByRole('button', { name: 'Salvar' })
    save.focus()

    await user.tab()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Fora' }))

    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })
})
