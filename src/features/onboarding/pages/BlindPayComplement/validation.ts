export type UploadKind = 'selfie' | 'proof'

const MAX_FILE_SIZE = 3 * 1024 * 1024

export function validateBlindPayUpload(file: File, kind: UploadKind): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowedExtensions = kind === 'selfie' ? ['jpg', 'jpeg', 'png'] : ['pdf', 'jpg', 'jpeg', 'png']
  const allowedMimes =
    kind === 'selfie' ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg', 'image/png']

  if (!allowedExtensions.includes(extension) || (file.type !== '' && !allowedMimes.includes(file.type))) {
    return kind === 'selfie'
      ? 'Envie uma foto JPG ou PNG.'
      : 'Envie um comprovante PDF, JPG ou PNG.'
  }
  if (file.size === 0) return 'O arquivo selecionado está vazio.'
  if (file.size > MAX_FILE_SIZE) return 'O arquivo deve ter no máximo 3 MB.'
  return null
}
