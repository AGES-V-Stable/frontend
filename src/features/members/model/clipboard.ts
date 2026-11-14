/**
 * Copia o texto para a área de transferência. Retorna false quando o navegador não oferece
 * a API ou recusa a cópia, para que a interface permita a cópia manual.
 *
 * Com um texto que ainda vai chegar (ex.: link buscado na API), a escrita começa no próprio clique
 * via `ClipboardItem`: Safari e iOS recusam a cópia iniciada depois de um `await`. Esta função
 * precisa ser chamada de forma síncrona no tratador do clique, antes de qualquer `await`.
 */
export async function copyText(text: string | Promise<string>): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
  if (typeof text !== 'string' && clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/plain': text.then((value) => new Blob([value], { type: 'text/plain' })),
        }),
      ])
      return true
    } catch {
      // Navegador sem suporte a conteúdo pendente: tenta a escrita simples abaixo.
    }
  }
  try {
    if (!clipboard?.writeText) return false
    await clipboard.writeText(await text)
    return true
  } catch {
    return false
  }
}
