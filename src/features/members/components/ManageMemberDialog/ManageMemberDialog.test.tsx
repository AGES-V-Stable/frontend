import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Member } from '../../schemas/members'
import { ManageMemberDialog } from './ManageMemberDialog'
import type { ManageMemberDialogProps } from './ManageMemberDialog'

const member: Member = {
  id: 'm-2',
  userId: 'u-2',
  companyId: 'c-1',
  name: 'Carlos Lima',
  email: 'carlos@empresa.com',
  role: 'VIEWER',
  status: 'ACTIVE',
  version: 2,
  joinedAt: '2026-11-01T12:00:00Z',
  removedAt: null,
}

function renderDialog(props: Partial<ManageMemberDialogProps> = {}) {
  const handlers = { onSave: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() }
  render(
    <>
      <button type="button">Gerenciar</button>
      <ManageMemberDialog member={member} pending={null} error={null} {...handlers} {...props} />
    </>,
  )
  return handlers
}

describe('ManageMemberDialog', () => {
  it('starts with the current role selected and saves only a different role', async () => {
    const { onSave } = renderDialog()

    expect(screen.getByRole('radio', { name: /Visualizador/ })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /Operador/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(onSave).toHaveBeenCalledWith('OPERATOR')
  })

  it('closes from the overlay when idle', async () => {
    const { onClose } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the focus inside the dialog while tabbing', async () => {
    renderDialog()
    const user = userEvent.setup()
    const save = screen.getByRole('button', { name: 'Salvar alterações' })
    await user.click(screen.getByRole('radio', { name: /Operador/ }))

    save.focus()
    await user.tab()
    expect(screen.getByRole('radio', { name: /Operador/ })).toHaveFocus()

    await user.tab({ shift: true })
    expect(save).toHaveFocus()
  })

  it('shows an error only in the step of the failed action', async () => {
    renderDialog({ error: { action: 'remove', message: 'Falha ao remover.' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remover membro' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao remover.')
  })

  it('blocks every action and closing while removing', async () => {
    const { onClose } = renderDialog({ pending: 'remove' })

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Remover membro' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Operador/ })).toBeDisabled()
  })
})
