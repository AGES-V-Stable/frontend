import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvitationLink } from './InvitationLink'

const URL = 'https://app.example/convites/empresa#token=opaque-token'

afterEach(() => vi.restoreAllMocks())

describe('InvitationLink', () => {
  it('shows the link in a read-only, selectable field without copying it by itself', () => {
    // userEvent instala o stub da área de transferência que é observado abaixo.
    userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    render(<InvitationLink inviteUrl={URL} />)

    const field = screen.getByRole('textbox', { name: 'Link do convite' })
    expect(field).toHaveValue(URL)
    expect(field).toHaveAttribute('readonly')
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Link copiado')).not.toBeInTheDocument()
  })

  it('shows "Link copiado" only after the browser confirms the copy', async () => {
    const user = userEvent.setup()
    let confirm: () => void = () => undefined
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockImplementation(() => new Promise<void>((resolve) => (confirm = resolve)))
    render(<InvitationLink inviteUrl={URL} />)

    await user.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(writeText).toHaveBeenCalledWith(URL)
    expect(screen.queryByText('Link copiado')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeDisabled()
    await act(async () => confirm())
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado')
  })

  it('copies the same link again on every click', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<InvitationLink inviteUrl={URL} />)

    await user.click(screen.getByRole('button', { name: 'Copiar link' }))
    await user.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenNthCalledWith(2, URL)
  })

  it('given the clipboard is blocked, then it selects the link for a manual copy', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'))
    render(<InvitationLink inviteUrl={URL} />)

    await user.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente.',
    )
    expect(screen.queryByText('Link copiado')).not.toBeInTheDocument()
    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Link do convite' })
    expect(field).toHaveFocus()
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(URL.length)
  })

  it('given a browser without the clipboard API, then it falls back to the manual copy', async () => {
    const user = userEvent.setup()
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    try {
      render(<InvitationLink inviteUrl={URL} />)

      await user.click(screen.getByRole('button', { name: 'Copiar link' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('copie manualmente')
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original)
    }
  })
})
