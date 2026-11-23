import { PATHS } from '@/shared/navigation/paths'

export function termsReturnDestination(search: string, appOrigin: string): string | null {
  const params = new URLSearchParams(search)
  const state = params.get('state')
  const tosId = params.get('tos_id')
  if (!state || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(state)) return null
  if (!tosId || !/^to_[A-Za-z0-9]{12}$/.test(tosId)) return null
  try {
    const target = new URL(PATHS.BLINDPAY_KYC, appOrigin)
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
      return null
    target.searchParams.set('state', state)
    target.searchParams.set('tos_id', tosId)
    return target.href
  } catch {
    return null
  }
}
