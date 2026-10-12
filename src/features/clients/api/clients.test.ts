import { afterEach, expect, it, vi } from 'vitest'
import { getClients } from './clients'
import { saveLoginToken } from '@/shared/http/authToken'
const summary = {
  id: 'c1',
  legalName: 'Empresa Ltda',
  tradeName: null,
  cnpj: '12345678000190',
  city: 'Porto Alegre',
  state: 'RS',
  overallStatus: 'APPROVED',
  representativeName: 'Maria',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: null,
}
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})
it('loads authenticated company summaries and adapts display fields', async () => {
  saveLoginToken('login')
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([summary])))
  vi.stubGlobal('fetch', fetchMock)
  const clients = await getClients()
  expect(clients[0]).toMatchObject({
    empresa: 'Empresa Ltda',
    responsavel: 'Maria',
    status: 'Aprovada',
    cidade: 'Porto Alegre / RS',
  })
  expect(fetchMock).toHaveBeenCalledWith(
    '/v1/companies/summaries',
    expect.objectContaining({ headers: { Authorization: 'Bearer login' } }),
  )
})
it('preserves a valid empty list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')))
  await expect(getClients()).resolves.toEqual([])
})
it.each([500, 401, 403])('rejects HTTP %s instead of fabricating clients', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
  await expect(getClients()).rejects.toMatchObject({ status })
})
it('rejects malformed rows', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[{"id":"x"}]')))
  await expect(getClients()).rejects.toThrow()
})
it('rejects network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
  await expect(getClients()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
})
