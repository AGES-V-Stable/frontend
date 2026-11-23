import { env } from '@/shared/schemas/env'
import { getAccessToken, getLoginToken } from '@/shared/http/authToken'

type Kind = 'UI_ERROR' | 'UNHANDLED_REJECTION' | 'NETWORK_FAILURE' | 'INVALID_RESPONSE'
type Module =
  | 'APPLICATION'
  | 'AUTH'
  | 'ONBOARDING'
  | 'BENEFICIARIES'
  | 'TRANSFERS'
  | 'MEMBERS'
  | 'SETTINGS'
  | 'OBSERVABILITY'

const observed = new WeakSet<object>()
let flow: { id: string; at: number } | undefined
let windowStart = 0
let sent = 0
const recent = new Map<string, number>()

export function moduleForPath(path: string): Module {
  if (/observability/.test(path)) return 'OBSERVABILITY'
  if (/beneficiar/.test(path)) return 'BENEFICIARIES'
  if (/transfer|quote|cotac/.test(path)) return 'TRANSFERS'
  if (/member|membro|invitation|convite/.test(path)) return 'MEMBERS'
  if (/onboarding|register|kyc|compliance/.test(path)) return 'ONBOARDING'
  if (/auth|login/.test(path)) return 'AUTH'
  if (/settings|configura/.test(path)) return 'SETTINGS'
  return 'APPLICATION'
}

/** Each user interaction starts a flow; requests snapshot its ID before awaiting. */
export function startInteraction() {
  flow = { id: crypto.randomUUID(), at: Date.now() }
}

export function correlationId(): string {
  if (!flow || Date.now() - flow.at > 30_000) startInteraction()
  return flow!.id
}

export function markObserved(error: unknown) {
  if (typeof error === 'object' && error !== null) observed.add(error)
}

/** Never sends exception messages, stacks, page URLs, request/response bodies or identity. */
export function reportBrowserEvent(kind: Kind, module: Module, id?: string, error?: unknown) {
  try {
    sendBrowserEvent(kind, module, id ?? correlationId(), error)
  } catch {
    // Storage, serialization and transport failures must never escape telemetry.
  }
}

function sendBrowserEvent(kind: Kind, module: Module, id: string, error?: unknown) {
  if (typeof error === 'object' && error !== null) {
    if (observed.has(error)) return
    observed.add(error)
  }
  const token = getLoginToken() ?? getAccessToken()
  if (!token) return
  const now = Date.now()
  if (now - windowStart >= 60_000) {
    windowStart = now
    sent = 0
    recent.clear()
  }
  const key = `${kind}:${module}:${id}`
  if (sent >= 10 || (recent.has(key) && now - recent.get(key)! < 5000)) return
  recent.set(key, now)
  sent++
  // Direct transport prevents telemetry requests from reporting their own failures.
  try {
    void fetch(`${env.VITE_API_URL}/v1/observability/browser-events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': id,
      },
      body: JSON.stringify({ eventId: crypto.randomUUID(), correlationId: id, kind, module }),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // Observability must never interrupt the interface.
  }
}

export function installBrowserTelemetry(): () => void {
  const onError = (event: ErrorEvent) =>
    reportBrowserEvent('UI_ERROR', moduleForPath(location.pathname), undefined, event.error)
  const onRejection = (event: PromiseRejectionEvent) =>
    reportBrowserEvent(
      'UNHANDLED_REJECTION',
      moduleForPath(location.pathname),
      undefined,
      event.reason,
    )
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') startInteraction()
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('click', startInteraction, true)
  window.addEventListener('keydown', onKey, true)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('click', startInteraction, true)
    window.removeEventListener('keydown', onKey, true)
  }
}
