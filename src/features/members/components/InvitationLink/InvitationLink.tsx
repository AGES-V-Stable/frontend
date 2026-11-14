import { useId, useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { copyText } from '../../model/clipboard'

export interface InvitationLinkProps {
  inviteUrl: string
}

/**
 * Link do convite em campo somente leitura, sempre selecionável, com cópia explícita.
 * "Link copiado" só aparece depois que o navegador confirma a cópia; se ela falhar, o link
 * fica selecionado para a cópia manual. Copiar de novo nunca gera um novo link.
 */
export function InvitationLink({ inviteUrl }: InvitationLinkProps) {
  const inputId = useId()
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    setStatus('copying')
    if (await copyText(inviteUrl)) {
      setStatus('copied')
      return
    }
    setStatus('failed')
    const input = document.getElementById(inputId) as HTMLInputElement | null
    input?.focus()
    input?.select()
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={inputId}
        label="Link do convite"
        value={inviteUrl}
        readOnly
        onChange={() => undefined}
        onFocus={(event) => event.currentTarget.select()}
        className="text-sm"
      />
      <Button
        type="button"
        variant="secondary"
        label="Copiar link"
        disabled={status === 'copying'}
        onClick={() => void copy()}
        className="sm:!w-auto sm:self-start"
      />
      <p role="status" className="text-sm font-medium text-emerald-700">
        {status === 'copied' ? 'Link copiado' : ''}
      </p>
      {status === 'failed' && (
        <p role="alert" className="text-sm text-red-700">
          Não foi possível copiar automaticamente. Selecione o link acima e copie manualmente.
        </p>
      )}
    </div>
  )
}
