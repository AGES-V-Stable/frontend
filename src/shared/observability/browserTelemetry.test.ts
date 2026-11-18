import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { saveLoginToken } from '@/shared/http/authToken'
import { httpResponse } from '@/shared/http/httpClient'
import {
  correlationId,
  installBrowserTelemetry,
  moduleForPath,
  reportBrowserEvent,
  startInteraction,
} from './browserTelemetry'

let testTime = Date.parse('2026-11-16T12:00:00Z')
beforeEach(() => {
  vi.useFakeTimers()
  testTime += 120_000
  vi.setSystemTime(testTime)
  startInteraction()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('shares interaction correlation with requests and rotates it for a new interaction', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  const id = correlationId()
  await httpResponse('/v1/transfers')
  expect(fetchMock.mock.calls[0][1].headers['X-Request-ID']).toBe(id)
  startInteraction()
  expect(correlationId()).not.toBe(id)
})

it('reports a network failure once without sending URL, credentials, error text or bodies', async () => {
  saveLoginToken('synthetic-login')
  const fetchMock = vi.fn().mockRejectedValue(new TypeError('password=secret email@example.test'))
  vi.stubGlobal('fetch', fetchMock)
  await expect(
    httpResponse('/v1/transfers?token=private', { body: 'personal-data', method: 'POST' }),
  ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  const [path, options] = fetchMock.mock.calls[1]
  expect(path).toBe('/v1/observability/browser-events')
  const body = JSON.parse(options.body)
  expect(body).toEqual({
    eventId: expect.any(String),
    correlationId: correlationId(),
    kind: 'NETWORK_FAILURE',
    module: 'TRANSFERS',
  })
  expect(options.body).not.toMatch(/secret|email|personal|token|synthetic-login/)
})

it('does not send another browser event for a backend HTTP failure', async () => {
  saveLoginToken('synthetic-login')
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
  vi.stubGlobal('fetch', fetchMock)
  const failure = await httpResponse('/v1/transfers').catch((error) => error)
  reportBrowserEvent('UNHANDLED_REJECTION', 'TRANSFERS', correlationId(), failure)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('deduplicates occurrences and limits telemetry frequency', () => {
  saveLoginToken('synthetic-login')
  vi.advanceTimersByTime(60_001)
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
  const error = new Error('never sent')
  reportBrowserEvent('UI_ERROR', 'APPLICATION', correlationId(), error)
  reportBrowserEvent('UNHANDLED_REJECTION', 'APPLICATION', correlationId(), error)
  for (let i = 0; i < 25; i++) {
    startInteraction()
    reportBrowserEvent('UI_ERROR', 'APPLICATION')
  }
  expect(fetchMock).toHaveBeenCalledTimes(10)
})

it('does not interrupt the interface when browser storage is unavailable', () => {
  const storage = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  expect(() => reportBrowserEvent('UI_ERROR', 'APPLICATION')).not.toThrow()
  storage.mockRestore()
})

it('captures and uninstalls global listeners and never reports without authentication', () => {
  const added = vi.spyOn(window, 'addEventListener')
  const removed = vi.spyOn(window, 'removeEventListener')
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
  const uninstall = installBrowserTelemetry()
  const handler = added.mock.calls.find(([name]) => name === 'error')![1] as (
    event: ErrorEvent,
  ) => void
  handler(new ErrorEvent('error', { error: new Error('private') }))
  expect(fetchMock).not.toHaveBeenCalled()
  saveLoginToken('synthetic-login')
  vi.advanceTimersByTime(60_001)
  window.dispatchEvent(new MouseEvent('click'))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  handler(new ErrorEvent('error', { error: new Error('private') }))
  expect(fetchMock).toHaveBeenCalledTimes(1)
  uninstall()
  expect(removed).toHaveBeenCalledWith('error', handler)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  added.mockRestore()
  removed.mockRestore()
})

it.each([
  ['/app/beneficiarios', 'BENEFICIARIES'],
  ['/v1/auth/login', 'AUTH'],
  ['/app/membros', 'MEMBERS'],
  ['/register', 'ONBOARDING'],
  ['/admin/observability', 'OBSERVABILITY'],
  ['/app/configuracoes', 'SETTINGS'],
  ['/unknown', 'APPLICATION'],
])('classifies %s without sending raw paths', (path, module) =>
  expect(moduleForPath(path)).toBe(module),
)
