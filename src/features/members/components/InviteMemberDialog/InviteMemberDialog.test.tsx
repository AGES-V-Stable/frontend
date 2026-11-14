import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InviteMemberDialog } from './InviteMemberDialog'
import type { InviteMemberDialogProps } from './InviteMemberDialog'

const generated = {
  invitation: {
    id: 'i-1',
    companyId: 'c-1',
    name: 'Bruno Alves',
    email: 'bruno@empresa.com',
    role: 'VIEWER' as const,
    status: 'PENDING' as const,
    version: 1,
  },
  inviteUrl: 'https://app.example/convites/empresa#token=opaque-token',
}

function renderDialog(props: Partial<InviteMemberDialogProps> = {}) {
  const handlers = { onSubmit: vi.fn(), onEmailEdit: vi.fn(), onClose: vi.fn() }
  const view = render(
    <InviteMemberDialog pending={false} failure={null} result={null} {...handlers} {...props} />,
  )
  return { ...handlers, ...view }
}

const fill = async (name: string, email: string, role?: RegExp) => {
  const user = userEvent.setup()
  if (name) await user.type(screen.getByLabelText('Nome'), name)
  if (email) await user.type(screen.getByLabelText('E-mail'), email)
  if (role) await user.click(screen.getByRole('radio', { name: role }))
  return user
}

describe('InviteMemberDialog — formulário', () => {
  it('opens Adicionar membro with the focus on the name and only Operador or Visualizador', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Adicionar membro' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('radio', { name: /Operador/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Visualizador/ })).not.toBeChecked()
    expect(screen.queryByRole('radio', { name: /Proprietário/ })).not.toBeInTheDocument()
  })

  it('given empty fields, when creating, then it requires name, e-mail and role and focuses the first', async () => {
    const { onSubmit } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Criar convite' }))

    expect(screen.getByText('Informe o nome da pessoa.')).toBeInTheDocument()
    expect(screen.getByText('Informe o e-mail da pessoa.')).toBeInTheDocument()
    expect(screen.getByText('Escolha o perfil de acesso.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('given an invalid e-mail, when creating, then it focuses the e-mail field', async () => {
    const { onSubmit } = renderDialog()
    const user = await fill('Bruno Alves', 'bruno@', /Operador/)

    await user.click(screen.getByRole('button', { name: 'Criar convite' }))

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('given a missing role, when creating, then it focuses the role choice', async () => {
    renderDialog()
    const user = await fill('Bruno Alves', 'bruno@empresa.com')

    await user.click(screen.getByRole('button', { name: 'Criar convite' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o perfil de acesso.')
    expect(screen.getByRole('radio', { name: /Operador/ })).toHaveFocus()
  })

  it('given valid data, when pressing Enter, then it submits the normalized form', async () => {
    const { onSubmit } = renderDialog()
    const user = await fill('  Bruno Alves ', ' Bruno@Empresa.com', /Visualizador/)

    await user.click(screen.getByLabelText('Nome'))
    await user.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Bruno Alves',
      email: 'bruno@empresa.com',
      role: 'VIEWER',
    })
  })

  it('given a creation in progress, then the form is locked and cannot be closed', async () => {
    const { onSubmit, onClose } = renderDialog({ pending: true })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: 'Criando convite...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByLabelText('Nome')).toBeDisabled()
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('given cancel, then it closes without submitting', async () => {
    const { onSubmit, onClose } = renderDialog()
    await fill('Bruno Alves', 'bruno@empresa.com', /Operador/)

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('given an e-mail rejected by the server, then it keeps name and role, focuses the e-mail and offers Corrigir e-mail', async () => {
    const view = renderDialog()
    const user = await fill('Bruno Alves', 'ana@empresa.com', /Visualizador/)
    const failure = {
      message: 'Este e-mail já pertence a um membro desta empresa.',
      stale: false,
      field: 'email' as const,
    }

    view.rerender(
      <InviteMemberDialog
        pending={false}
        failure={failure}
        result={null}
        onSubmit={view.onSubmit}
        onEmailEdit={view.onEmailEdit}
        onClose={view.onClose}
      />,
    )

    const email = screen.getByLabelText('E-mail')
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(failure.message)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Bruno Alves')
    expect(screen.getByRole('radio', { name: /Visualizador/ })).toBeChecked()

    await user.click(screen.getByLabelText('Nome'))
    await user.click(screen.getByRole('button', { name: 'Corrigir e-mail' }))
    expect(email).toHaveFocus()

    await user.keyboard('x')
    expect(view.onEmailEdit).toHaveBeenCalled()
  })

  it('given a general failure, then it shows it inside the dialog', () => {
    renderDialog({
      failure: { message: 'Não foi possível criar o convite. Tente novamente.', stale: false },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível criar o convite. Tente novamente.',
    )
  })
})

describe('InviteMemberDialog — convite criado', () => {
  it('shows Convite criado para {nome}, the manual sharing guidance and the link to copy', () => {
    renderDialog({ result: { generated, existing: false } })

    const dialog = screen.getByRole('dialog', { name: 'Convite criado para Bruno Alves' })
    expect(dialog).toHaveTextContent('Copie o link e envie para a pessoa')
    expect(dialog).toHaveTextContent('Visualizador')
    expect(screen.getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      generated.inviteUrl,
    )
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeEnabled()
    expect(dialog).not.toHaveTextContent(/e-mail enviado|expira|validade|reenviar/i)
  })

  it('given an existing pending invitation, then it says no new invitation was created', () => {
    renderDialog({ result: { generated, existing: true } })

    const dialog = screen.getByRole('dialog', {
      name: 'Já existe um convite pendente para Bruno Alves',
    })
    expect(dialog).toHaveTextContent('Nenhum convite novo foi criado.')
    expect(screen.getByRole('textbox', { name: 'Link do convite' })).toHaveValue(
      generated.inviteUrl,
    )
  })

  it('closes with Concluir', async () => {
    const { onClose } = renderDialog({ result: { generated, existing: false } })

    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
