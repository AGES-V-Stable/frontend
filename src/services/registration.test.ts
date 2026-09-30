import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, request } from './registration'

describe('registration service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with the parsed JSON body on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'abc' }) }),
    )

    await expect(request('/example')).resolves.toEqual({ token: 'abc' })
  })

  it('throws an ApiError with the backend message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'E-mail já cadastrado' }),
      }),
    )

    await expect(request('/example')).rejects.toMatchObject({
      status: 409,
      message: 'E-mail já cadastrado',
    })
  })

  it('falls back to a generic message when the error body has no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    )

    await expect(request('/example')).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })

  it('falls back to a generic message when the error body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json')
        },
      }),
    )

    await expect(request('/example')).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    )
  })
})

describe('ApiError', () => {
  it('carries the http status alongside the message', () => {
    const error = new ApiError(404, 'Não encontrado')

    expect(error.status).toBe(404)
    expect(error.message).toBe('Não encontrado')
    expect(error).toBeInstanceOf(Error)
  })
})
