import { z } from 'zod'

/**
 * VITE_API_URL é só a ORIGEM do backend (ex.: "https://api.vstable.com"), sem "/v1".
 * Vazio/ausente = mesma origem do frontend: em desenvolvimento o Vite faz proxy de
 * "/v1" para o Spring (API_PROXY_TARGET); em produção o servidor web precisa
 * encaminhar "/v1" para o backend.
 */
const apiOriginSchema = z
  .union([
    z.literal(''),
    z.string().url('VITE_API_URL deve ser uma URL absoluta (ex.: https://api.exemplo.com)'),
  ])
  .transform((value) => value.replace(/\/+$/, ''))

export function parseApiOrigin(value: string | undefined): string {
  return apiOriginSchema.parse((value ?? '').trim())
}

export function getApiOrigin(): string {
  return parseApiOrigin(import.meta.env.VITE_API_URL)
}
