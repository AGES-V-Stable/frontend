import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each(['', 'https://api.example.test', 'http://localhost:8080/'])(
  'builds complete API paths using configured origin %s',
  async (origin) => {
    vi.stubEnv('VITE_API_URL', origin)
    vi.resetModules()
    const { apiUrl } = await import('../http/httpClient')
    expect(apiUrl('/v1/users/me')).toBe(`${origin.replace(/\/$/, '')}/v1/users/me`)
    expect(apiUrl('/api/transferencias/id')).toBe(
      `${origin.replace(/\/$/, '')}/api/transferencias/id`,
    )
  },
)

it.each([
  'https://api.example.test/api',
  'https://api.example.test?token=x',
  'https://api.example.test#fragment',
  'https://user:password@api.example.test',
  'ftp://api.example.test',
  'api.example.test',
])('rejects an invalid backend origin %s', async (origin) => {
  vi.stubEnv('VITE_API_URL', origin)
  vi.resetModules()
  await expect(import('./env')).rejects.toThrow('VITE_API_URL deve ser a origem do backend')
})
