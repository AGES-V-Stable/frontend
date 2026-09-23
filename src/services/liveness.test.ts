import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkLivenessStatus,
  clearLivenessSession,
  getLivenessId,
  getLivenessStatus,
  saveLivenessSession,
  setLivenessStatus,
  startLivenessVerification,
  submitLivenessResult,
} from './liveness'

describe('liveness service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('startLivenessVerification', () => {
    it('given a progresso de cadastro, when starting a liveness verification, then it should POST to our backend compliance endpoint and return the Avenia session fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'liveness-1',
          sessionId: 'session-1',
          livenessUrl: 'https://app.sandbox.avenia.io/liveness/session-1',
          validateLivenessToken: 'token-1',
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await startLivenessVerification('cadastro-1')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/onboarding/cadastro-1/compliance/liveness'),
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result).toEqual({
        id: 'liveness-1',
        sessionId: 'session-1',
        livenessUrl: 'https://app.sandbox.avenia.io/liveness/session-1',
        validateLivenessToken: 'token-1',
      })
    })

    it('given our backend returns an error, when starting a liveness verification, then it should throw', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }),
      )

      await expect(startLivenessVerification('cadastro-1')).rejects.toThrow()
    })
  })

  describe('checkLivenessStatus', () => {
    it('given a progresso de cadastro and a liveness id, when checking the status, then it should GET the status endpoint with the livenessId as a query param', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ready: true, status: 'UPLOADED' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await checkLivenessStatus('cadastro-1', 'liveness-1')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          '/v1/onboarding/cadastro-1/compliance/liveness/status?livenessId=liveness-1',
        ),
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual({ ready: true, status: 'UPLOADED' })
    })

    it('given our backend returns an error, when checking the status, then it should throw', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => 'boom' }),
      )

      await expect(checkLivenessStatus('cadastro-1', 'liveness-1')).rejects.toThrow()
    })
  })

  describe('submitLivenessResult', () => {
    it('given a progresso de cadastro and a liveness id, when submitting the result, then it should PUT to the cadastro compliance endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
      vi.stubGlobal('fetch', fetchMock)

      await submitLivenessResult('cadastro-1', 'liveness-1')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/onboarding/cadastro-1/compliance/liveness'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ livenessId: 'liveness-1' }),
        }),
      )
    })
  })

  describe('session persistence helpers', () => {
    it('given no session has been saved, when reading the liveness status, then it should default to idle', () => {
      expect(getLivenessStatus('cadastro-1')).toBe('idle')
      expect(getLivenessId('cadastro-1')).toBeNull()
    })

    it('given a liveness session is saved, when reading it back, then it should return the stored id and status', () => {
      saveLivenessSession('cadastro-1', 'liveness-1', 'pending')

      expect(getLivenessId('cadastro-1')).toBe('liveness-1')
      expect(getLivenessStatus('cadastro-1')).toBe('pending')
    })

    it('given a saved session, when updating only the status, then it should keep the stored id', () => {
      saveLivenessSession('cadastro-1', 'liveness-1', 'pending')

      setLivenessStatus('cadastro-1', 'success')

      expect(getLivenessId('cadastro-1')).toBe('liveness-1')
      expect(getLivenessStatus('cadastro-1')).toBe('success')
    })

    it('given a session belongs to another cadastro, when reading it, then it should be ignored', () => {
      saveLivenessSession('cadastro-antigo', 'liveness-1', 'success')

      expect(getLivenessId('cadastro-atual')).toBeNull()
      expect(getLivenessStatus('cadastro-atual')).toBe('idle')
    })

    it('given a saved session, when clearing it, then both the id and status should be removed', () => {
      saveLivenessSession('cadastro-1', 'liveness-1', 'success')

      clearLivenessSession()

      expect(getLivenessId('cadastro-1')).toBeNull()
      expect(getLivenessStatus('cadastro-1')).toBe('idle')
    })
  })
})
