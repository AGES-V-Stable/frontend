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
})
