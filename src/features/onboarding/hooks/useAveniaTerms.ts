import { useEffect, useState } from 'react'
import { acceptAveniaTerms, getAveniaTerms } from '../api/compliance'
import type { AveniaTerms } from '../api/compliance'

/**
 * Termos da Avenia da subconta do titular. A Avenia exige que todo usuário final,
 * inclusive de subconta, aceite os documentos depois de vê-los; o backend recusa
 * o envio do KYC sem esse aceite.
 */
export function useAveniaTerms(kycVerificationId?: string) {
  const [terms, setTerms] = useState<AveniaTerms | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!kycVerificationId) return
    let current = true
    getAveniaTerms(kycVerificationId)
      .then((value) => {
        if (current) setTerms(value)
      })
      .catch(() => {
        if (current) setLoadFailed(true)
      })
    return () => {
      current = false
    }
  }, [kycVerificationId, attempt])

  function retry() {
    setLoadFailed(false)
    setAttempt((value) => value + 1)
  }

  function check(value: boolean) {
    setChecked(value)
    setError('')
  }

  /** Registra o aceite (se ainda não feito) e diz se o envio pode prosseguir. */
  async function ensureAccepted(): Promise<boolean> {
    if (!kycVerificationId || !terms) {
      setError('Carregue os termos da Avenia antes de continuar.')
      return false
    }
    if (terms.accepted) return true
    if (!checked) {
      setError('Aceite os termos de uso e a política de privacidade da Avenia para continuar.')
      return false
    }
    try {
      setTerms(await acceptAveniaTerms(kycVerificationId, terms.version))
      return true
    } catch {
      setError('Não foi possível registrar o aceite dos termos da Avenia. Tente novamente.')
      return false
    }
  }

  return { terms, loadFailed, checked, error, check, retry, ensureAccepted }
}
