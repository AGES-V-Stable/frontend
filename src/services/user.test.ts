import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from './registration'
import { getCurrentUser } from './user'

afterEach(() => vi.unstubAllGlobals())

it('fetches the current user from /v1/users/me', async () => {
  const user = { id: 'u1', name: 'Marina Costa', email: 'marina@example.com', companyId: 'c1' }
  const mock = vi.fn(async () => new Response(JSON.stringify(user), { status: 200 }))
  vi.stubGlobal('fetch', mock)

  await expect(getCurrentUser()).resolves.toEqual(user)
  expect(mock).toHaveBeenCalledWith('/v1/users/me', { signal: undefined })
})

it('forwards the abort signal', async () => {
  const controller = new AbortController()
  const mock = vi.fn(async () => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', mock)

  await getCurrentUser(controller.signal)

  expect(mock).toHaveBeenCalledWith('/v1/users/me', { signal: controller.signal })
})

it('throws an ApiError when the request fails', async () => {
  const mock = vi.fn(
    async () => new Response(JSON.stringify({ message: 'Não autenticado' }), { status: 401 }),
  )
  vi.stubGlobal('fetch', mock)

  await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError)
  await expect(getCurrentUser()).rejects.toThrow('Não autenticado')
})
