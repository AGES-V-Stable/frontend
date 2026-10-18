import { z } from 'zod'

const origin = z.string().refine((value) => {
  if (!value) return true
  try {
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}, 'VITE_API_URL deve ser a origem do backend, sem caminho ou credenciais.')

export const env = z.object({ VITE_API_URL: origin }).parse({
  VITE_API_URL: (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''),
})
