/** `idDocument` e `selfie` aceitam só imagem; o backend recusa PDF nesses campos. */
export type UploadKind = 'selfie' | 'idDocument' | 'proof'

export const MAX_FILE_SIZE = 3 * 1024 * 1024

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png']
const IMAGE_MIMES = ['image/jpeg', 'image/png']

export function isImageOnly(kind: UploadKind) {
  return kind !== 'proof'
}

export function validateBlindPayUpload(file: File, kind: UploadKind): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const imageOnly = isImageOnly(kind)
  const allowedExtensions = imageOnly ? IMAGE_EXTENSIONS : [...IMAGE_EXTENSIONS, 'pdf']
  const allowedMimes = imageOnly ? IMAGE_MIMES : [...IMAGE_MIMES, 'application/pdf']

  if (
    !allowedExtensions.includes(extension) ||
    (file.type !== '' && !allowedMimes.includes(file.type))
  ) {
    if (kind === 'selfie') return 'Envie uma foto JPG ou PNG.'
    if (kind === 'idDocument') return 'Envie uma imagem JPG ou PNG do documento.'
    return 'Envie um comprovante PDF, JPG ou PNG.'
  }
  if (file.size === 0) return 'O arquivo selecionado está vazio.'
  if (file.size > MAX_FILE_SIZE) return 'O arquivo deve ter no máximo 3 MB.'
  return null
}

export interface PersonalData {
  firstName: string
  lastName: string
  dateOfBirth: string
  cpf: string
  phone: string
  postalCode: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
}

export const EMPTY_PERSONAL_DATA: PersonalData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  cpf: '',
  phone: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
}

const digits = (value: string) => value.replace(/\D/g, '')

/** Mesmo algoritmo do backend: evita ida ao servidor com CPF digitado errado. */
export function isValidCpf(value: string): boolean {
  const cpf = digits(value)
  if (!/^\d{11}$/.test(cpf) || new Set(cpf).size === 1) return false
  for (let length = 9; length <= 10; length++) {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i)
    const digit = (sum * 10) % 11
    if ((digit === 10 ? 0 : digit) !== Number(cpf[length])) return false
  }
  return true
}

const REQUIRED: (keyof PersonalData)[] = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'cpf',
  'phone',
  'postalCode',
  'addressLine1',
  'city',
  'state',
]

/** Retorna apenas campos com erro; objeto vazio significa dados válidos. */
export function validatePersonalData(
  data: PersonalData,
  today = new Date(),
): Partial<Record<keyof PersonalData, string>> {
  const errors: Partial<Record<keyof PersonalData, string>> = {}
  for (const field of REQUIRED) {
    if (!data[field].trim()) errors[field] = 'Campo obrigatório.'
  }
  if (!errors.cpf && !isValidCpf(data.cpf)) errors.cpf = 'Informe um CPF válido.'
  if (!errors.phone && !/^[1-9]\d{9,10}$/.test(digits(data.phone)))
    errors.phone = 'Informe DDD e número.'
  if (!errors.postalCode && digits(data.postalCode).length !== 8)
    errors.postalCode = 'Informe os 8 dígitos do CEP.'
  if (!errors.dateOfBirth && data.dateOfBirth >= today.toISOString().slice(0, 10))
    errors.dateOfBirth = 'Informe uma data de nascimento anterior a hoje.'
  return errors
}

export function toDigits(value: string) {
  return digits(value)
}
