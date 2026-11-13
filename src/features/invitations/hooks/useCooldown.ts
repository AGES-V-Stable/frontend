import { useCallback, useEffect, useState } from 'react'

/** Bloqueia novas tentativas pelo tempo pedido no `Retry-After` de um 429. */
export function useCooldown() {
  const [cooldown, setCooldown] = useState<{ seconds: number } | null>(null)

  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(null), cooldown.seconds * 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const start = useCallback((seconds: number) => setCooldown({ seconds }), [])
  return { coolingDown: cooldown !== null, seconds: cooldown?.seconds ?? 0, start }
}

export const rateLimitMessage = (seconds: number) =>
  `Muitas tentativas em pouco tempo. Aguarde ${seconds} segundo${seconds === 1 ? '' : 's'} e tente novamente.`
