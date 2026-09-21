import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as livenessService from '@/services/liveness'
import * as onboardingService from '@/services/onboarding'

import LivenessStep from './LivenessStep'

vi.mock('@/services/liveness', async () => {
  const actual = await vi.importActual<typeof import('@/services/liveness')>('@/services/liveness')
  return {
    ...actual,
    startLivenessVerification: vi.fn(),
    checkLivenessStatus: vi.fn(),
    submitLivenessResult: vi.fn(),
  }
})

vi.mock('@/services/onboarding', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/onboarding')>('@/services/onboarding')
  return {
    ...actual,
    submitKyc: vi.fn(),
  }
})

const personalData = {
  fullName: 'Maria da Silva',
  email: 'maria@empresa.com',
  phone: '11987654321',
  dateOfBirth: '1990-05-20',
  taxIdNumber: '52998224725',
  country: 'Brasil',
  state: 'SP',
  city: 'São Paulo',
  zipCode: '90000000',
  streetAddress: 'Rua Teste, 100',
}

function renderLivenessStep(props: React.ComponentProps<typeof LivenessStep> = {}) {
  return render(
    <MemoryRouter>
      <LivenessStep {...props} />
    </MemoryRouter>,
  )
}

describe('LivenessStep Page Component', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('given the liveness step is rendered, when no verification has happened yet, then the Continuar button should be disabled', () => {
    renderLivenessStep()

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('given the user clicks the start button, when the backend call succeeds, then it should save the liveness id and open the returned livenessUrl in a new tab', async () => {
    vi.mocked(livenessService.startLivenessVerification).mockResolvedValue({
      id: 'liveness-1',
      sessionId: 'session-1',
      livenessUrl: 'https://avenia.io/liveness/liveness-1',
      validateLivenessToken: 'token-1',
    })
    const openMock = vi.fn().mockReturnValue({} as Window)
    vi.stubGlobal('open', openMock)

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))

    await waitFor(() => {
      expect(livenessService.getLivenessId()).toBe('liveness-1')
    })
    expect(livenessService.startLivenessVerification).toHaveBeenCalledWith('cadastro-1')
    expect(openMock).toHaveBeenCalledWith(
      'https://avenia.io/liveness/liveness-1',
      '_blank',
      'noopener,noreferrer',
    )
    expect(screen.getByRole('button', { name: 'Verificar conclusão' })).toBeInTheDocument()
  })

  it('given the browser blocks the pop-up, when the user clicks the start button, then it should show an error and reset the pending state', async () => {
    vi.mocked(livenessService.startLivenessVerification).mockResolvedValue({
      id: 'liveness-1',
      sessionId: 'session-1',
      livenessUrl: 'https://avenia.io/liveness/liveness-1',
      validateLivenessToken: 'token-1',
    })
    vi.stubGlobal('open', vi.fn().mockReturnValue(null))

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Permita pop-ups')
    expect(livenessService.getLivenessId()).toBeNull()
    expect(screen.getByRole('button', { name: 'Iniciar verificação facial' })).toBeEnabled()
  })

  it('given no progresso de cadastro id, when the user clicks the start button, then it should show an error instead of starting', async () => {
    renderLivenessStep()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar verificação facial' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reinicie a verificação')
    expect(livenessService.startLivenessVerification).not.toHaveBeenCalled()
  })

  it('given a pending verification, when the user clicks Verificar conclusão and it is ready, then it should unlock the Continuar button', async () => {
    livenessService.saveLivenessSession('liveness-1', 'pending')
    vi.mocked(livenessService.checkLivenessStatus).mockResolvedValue({
      ready: true,
      status: 'UPLOADED',
    })

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Verificar conclusão' }))

    expect(livenessService.checkLivenessStatus).toHaveBeenCalledWith('cadastro-1', 'liveness-1')
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(screen.getByText('Verificação concluída com sucesso.')).toBeInTheDocument()
  })

  it('given a pending verification, when the user clicks Verificar conclusão and it is not ready yet, then it should show an informational message and keep Continuar disabled', async () => {
    livenessService.saveLivenessSession('liveness-1', 'pending')
    vi.mocked(livenessService.checkLivenessStatus).mockResolvedValue({
      ready: false,
      status: 'WAITING-UPLOAD',
    })

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Verificar conclusão' }))

    expect(await screen.findByRole('status')).toHaveTextContent('ainda não concluída')
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('given a pending verification, when the check call fails, then it should show an error', async () => {
    livenessService.saveLivenessSession('liveness-1', 'pending')
    vi.mocked(livenessService.checkLivenessStatus).mockRejectedValue(new Error('network error'))

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Verificar conclusão' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar')
  })

  it('given a pending verification, when the user clicks Recomeçar verificação, then it should reset back to idle', async () => {
    livenessService.saveLivenessSession('liveness-1', 'pending')

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Recomeçar verificação' }))

    expect(screen.getByRole('button', { name: 'Iniciar verificação facial' })).toBeInTheDocument()
    expect(livenessService.getLivenessId()).toBeNull()
  })

  it('given a successful verification survives a reload, when the liveness step mounts again, then it should read the status from storage', () => {
    livenessService.saveLivenessSession('liveness-1', 'success')

    renderLivenessStep()

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('given a verified session, a progresso de cadastro id and saved personal data, when the user clicks Continuar, then it should submit the liveness result, finalize the KYC and call onContinue', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')
    onboardingService.saveRepresentativePersonalData(personalData)
    vi.mocked(livenessService.submitLivenessResult).mockResolvedValue(undefined)
    vi.mocked(onboardingService.submitKyc).mockResolvedValue({ aveniaProcessId: 'kyc-process-1' })
    const onContinue = vi.fn()

    renderLivenessStep({ progressoCadastroId: 'cadastro-1', onContinue })
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(livenessService.submitLivenessResult).toHaveBeenCalledWith('cadastro-1', 'liveness-1')
    })
    expect(onboardingService.submitKyc).toHaveBeenCalledWith('cadastro-1', personalData)
    expect(onboardingService.getRepresentativePersonalData()).toBeNull()
    expect(onContinue).toHaveBeenCalled()
  })

  it('given a verified session without a progresso de cadastro id, when the user clicks Continuar, then it should show an error instead of submitting', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')
    onboardingService.saveRepresentativePersonalData(personalData)

    renderLivenessStep()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Reinicie a verificação')
    expect(livenessService.submitLivenessResult).not.toHaveBeenCalled()
  })

  it('given a verified session without saved personal data, when the user clicks Continuar, then it should show an error instead of submitting', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')

    renderLivenessStep({ progressoCadastroId: 'cadastro-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível recuperar os dados do representante',
    )
    expect(livenessService.submitLivenessResult).not.toHaveBeenCalled()
  })

  it('given the KYC finalization fails, when the user clicks Continuar, then it should show an error and not call onContinue', async () => {
    livenessService.saveLivenessSession('liveness-1', 'success')
    onboardingService.saveRepresentativePersonalData(personalData)
    vi.mocked(livenessService.submitLivenessResult).mockResolvedValue(undefined)
    vi.mocked(onboardingService.submitKyc).mockRejectedValue(new Error('network error'))
    const onContinue = vi.fn()

    renderLivenessStep({ progressoCadastroId: 'cadastro-1', onContinue })
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível confirmar a verificação',
    )
    expect(onContinue).not.toHaveBeenCalled()
  })
})
