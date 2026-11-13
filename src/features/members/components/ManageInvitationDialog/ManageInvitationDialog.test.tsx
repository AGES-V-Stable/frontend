import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Invitation } from '../../schemas/members'
import { ManageInvitationDialog } from './ManageInvitationDialog'
import type { ManageInvitationDialogProps } from './ManageInvitationDialog'

const invitation: Invitation = {
  id: 'i-1',
  companyId: 'c-1',
  name: 'Bruno Alves',
  email: 'bruno@empresa.com',
  role: 'OPERATOR',
  status: 'PENDING',
  version: 1,
}

function renderDialog(props: Partial<ManageInvitationDialogProps> = {}) {
  const handlers = {
    onRegenerate: vi.fn().mockResolvedValue(true),
    onRevoke: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <ManageInvitationDialog
      invitation={invitation}
      inviteUrl={null}
      notice={null}
      pending={null}
      error={null}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('ManageInvitationDialog', () => {
  it('shows the pending invitation with separate actions to regenerate and revoke', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog', { name: 'Gerenciar convite' })
    expect(dialog).toHaveTextContent('Bruno Alves')
    expect(dialog).toHaveTextContent('bruno@empresa.com')
    expect(dialog).toHaveTextContent('Operador')
    expect(dialog).toHaveTextContent('Convite pendente')
    expect(screen.getByRole('button', { name: 'Gerar novo link' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Revogar convite' })).toBeEnabled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('asks for confirmation before regenerating and keeps the link when choosing Manter link atual', async () => {
    const { onRegenerate } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))

    const confirm = screen.getByRole('dialog', { name: 'Gerar novo link para Bruno Alves?' })
    expect(confirm).toHaveTextContent('O link atual deixará de funcionar imediatamente.')
    await userEvent.click(screen.getByRole('button', { name: 'Manter link atual' }))
    expect(screen.getByRole('dialog', { name: 'Gerenciar convite' })).toBeInTheDocument()
    expect(onRegenerate).not.toHaveBeenCalled()
  })

  it('given the confirmation, when the new link is generated, then it returns to the invitation', async () => {
    const { onRegenerate } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))

    expect(onRegenerate).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('dialog', { name: 'Gerenciar convite' })).toBeInTheDocument()
  })

  it('given a failed regeneration, then it stays on the confirmation', async () => {
    const onRegenerate = vi.fn().mockResolvedValue(false)
    renderDialog({ onRegenerate })

    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))

    expect(
      screen.getByRole('dialog', { name: 'Gerar novo link para Bruno Alves?' }),
    ).toBeInTheDocument()
  })

  it('asks for confirmation before revoking and keeps the invitation when choosing Manter convite', async () => {
    const { onRevoke } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Revogar convite' }))

    const confirm = screen.getByRole('dialog', { name: 'Revogar convite de Bruno Alves?' })
    expect(confirm).toHaveTextContent('O link deixará de funcionar')
    await userEvent.click(screen.getByRole('button', { name: 'Manter convite' }))
    expect(onRevoke).not.toHaveBeenCalled()
  })

  it('given the confirmation, then it revokes', async () => {
    const { onRevoke } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Revogar convite' }))
    await userEvent.click(screen.getByRole('button', { name: 'Revogar convite' }))

    expect(onRevoke).toHaveBeenCalledTimes(1)
  })

  it('shows the error of each action only on its own confirmation step', async () => {
    renderDialog({ error: { action: 'revoke', message: 'Não foi possível revogar o convite.' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gerar novo link' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Manter link atual' }))
    await userEvent.click(screen.getByRole('button', { name: 'Revogar convite' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível revogar o convite.')
  })

  it('given a revocation in progress, then nothing can close the dialog', async () => {
    const { onClose } = renderDialog({ pending: 'revoke' })
    const user = userEvent.setup()

    const dialog = screen.getByRole('dialog', { name: 'Gerenciar convite' })
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gerar novo link' })).toBeDisabled()
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('given a link in memory with a notice, then it shows both', () => {
    renderDialog({
      inviteUrl: 'https://app.example/convites/empresa#token=opaque-token',
      notice: { tone: 'warning', message: 'Selecione o link abaixo e copie manualmente.' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Selecione o link abaixo')
    expect(screen.getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      'https://app.example/convites/empresa#token=opaque-token',
    )
  })
})
