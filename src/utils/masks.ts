export const maskCNPJ = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')

export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

// Telefone fixo (10 dígitos) usa 4-4 (ex.: 3265-4321); celular (11 dígitos)
// usa 5-4 (ex.: 98765-4321) — o total de dígitos decide o corte, senão um
// fixo de 8 dígitos após o DDD acaba formatado como 5-3 em vez de 4-4.
export const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (rest.length === 0) return ddd
  if (rest.length <= 4) return `(${ddd}) ${rest}`

  const splitAt = digits.length === 11 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`
}
