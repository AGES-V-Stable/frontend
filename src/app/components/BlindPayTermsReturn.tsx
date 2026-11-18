import { useEffect } from 'react'
import { termsReturnDestination } from '@/app/termsReturnDestination'

/** Public transport of the hosted return only; acceptance still requires an authenticated API call. */
export function BlindPayTermsReturn() {
  const target = termsReturnDestination(
    window.location.search,
    import.meta.env.VITE_APP_ORIGIN || window.location.origin,
  )
  useEffect(() => {
    if (target) window.location.replace(target)
  }, [target])
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-12">
      <h1 className="text-xl font-bold">Retorno dos termos BlindPay</h1>
      {target ? (
        <a className="text-primary underline" href={target}>
          Voltar ao cadastro
        </a>
      ) : (
        <p role="alert">Retorno inválido. Volte ao cadastro e gere um novo link dos termos.</p>
      )}
    </main>
  )
}
