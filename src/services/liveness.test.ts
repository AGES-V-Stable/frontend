import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
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
    sessionStorage.clear()
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
        expect.stringContaining('/v1/cadastros/cadastro-1/compliance/liveness'),
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

  describe('submitLivenessResult', () => {
    it('given a progresso de cadastro and a liveness id, when submitting the result, then it should PUT to the cadastro compliance endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
      vi.stubGlobal('fetch', fetchMock)

      await submitLivenessResult('cadastro-1', 'liveness-1')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/cadastros/cadastro-1/compliance/liveness'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ livenessId: 'liveness-1' }),
        }),
      )
    })
  })

  describe('session storage helpers', () => {
    it('given no session has been saved, when reading the liveness status, then it should default to idle', () => {
      expect(getLivenessStatus()).toBe('idle')
      expect(getLivenessId()).toBeNull()
    })

    it('given a liveness session is saved, when reading it back, then it should return the stored id and status', () => {
      saveLivenessSession('liveness-1', 'pending')

      expect(getLivenessId()).toBe('liveness-1')
      expect(getLivenessStatus()).toBe('pending')
    })

    it('given a saved session, when updating only the status, then it should keep the stored id', () => {
      saveLivenessSession('liveness-1', 'pending')

      setLivenessStatus('success')

      expect(getLivenessId()).toBe('liveness-1')
      expect(getLivenessStatus()).toBe('success')
    })

    it('given a saved session, when clearing it, then both the id and status should be removed', () => {
      saveLivenessSession('liveness-1', 'success')

      clearLivenessSession()

      expect(getLivenessId()).toBeNull()
      expect(getLivenessStatus()).toBe('idle')
    })
  })
})
