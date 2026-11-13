/**
 * Copia o texto para a área de transferência. Retorna false quando o navegador não oferece
 * a API ou recusa a cópia, para que a interface permita a cópia manual.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
