import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as livenessService from '@/services/liveness'

import LivenessStep from './LivenessStep'

vi.mock('@/services/liveness', async () => {
  const actual = await vi.importActual<typeof import('@/services/liveness')>('@/services/liveness')
  return {
    ...actual,
    startLivenessVerification: vi.fn(),
    submitLivenessResult: vi.fn(),
  }
})

function renderLivenessStep(props: React.ComponentProps<typeof LivenessStep> = {}) {
  return render(
    <MemoryRouter>
      <LivenessStep {...props} />
    </MemoryRouter>,
  )
}

describe('LivenessStep Page Component', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('given the liveness step is rendered, when no verification has happened yet, then the Continuar button should be disabled', () => {
    renderLivenessStep()

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('given the user clicks the start button, when the backend call succeeds, then it should save the liveness id and redirect to the returned livenessUrl', async () => {
    vi.mocked(livenessService.startLivenessVerification).mockResolvedValue({
      id: 'liveness-1',
      sessionId: 'session-1',
      livenessUrl: 'https://avenia.io/liveness/liveness-1',
      validateLivenessToken: 'token-1',
    })
    delete (window as unknown as { location?: unknown }).location
    ;(window as unknown as { location: { href: string } }).location = { href: '' }

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))

    await waitFor(() => {
      expect(livenessService.getLivenessId()).toBe('liveness-1')
    })
    expect(livenessService.startLivenessVerification).toHaveBeenCalledWith('cadastro-1')
    expect(window.location.href).toBe('https://avenia.io/liveness/liveness-1')
  })

  it('given no progresso de cadastro id, when the user clicks the start button, then it should show an error instead of starting', async () => {
    renderLivenessStep()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reinicie a verificação')
    expect(livenessService.startLivenessVerification).not.toHaveBeenCalled()
  })

  it('given the user returns from the Avenia redirect with a success status, when the liveness step mounts, then it should unlock the Continuar button', () => {
    render(
      <MemoryRouter initialEntries={['/liveness?status=success']}>
        <LivenessStep progressoCadastroId="cadastro-1" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(screen.getByText('Verificação concluída com sucesso.')).toBeInTheDocument()
  })

  it('given the user returns from the Avenia redirect with a failure status, when the liveness step mounts, then it should show an error and allow retrying', () => {
    render(
      <MemoryRouter initialEntries={['/liveness?status=failed']}>
        <LivenessStep />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('given a successful verification survives a reload, when the liveness step mounts again, then it should read the status from session storage', () => {
    livenessService.saveLivenessSession('liveness-1', 'success')

    renderLivenessStep()

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('given a verified session and a progresso de cadastro id, when the user clicks Continuar, then it should submit the liveness result and call onContinue', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')
    vi.mocked(livenessService.submitLivenessResult).mockResolvedValue(undefined)
    const onContinue = vi.fn()

    renderLivenessStep({ progressoCadastroId: 'cadastro-1', onContinue })
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(livenessService.submitLivenessResult).toHaveBeenCalledWith('cadastro-1', 'liveness-1')
    })
    expect(onContinue).toHaveBeenCalled()
  })

  it('given a verified session without a progresso de cadastro id, when the user clicks Continuar, then it should show an error instead of submitting', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')

    renderLivenessStep()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reinicie a verificação')
    expect(livenessService.submitLivenessResult).not.toHaveBeenCalled()
  })
})
