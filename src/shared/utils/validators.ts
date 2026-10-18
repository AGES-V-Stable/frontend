export const isValidCNPJ = (cnpj: string) => {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (((length - 1 - i) % 8) + 2)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return digit(12) === Number(digits[12]) && digit(13) === Number(digits[13])
}

export const isValidCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false

  const calc = (n: number) => {
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += parseInt(cleanCPF[i]) * (n + 1 - i)
    }
    return ((sum * 10) % 11) % 10
  }

  return calc(9) === parseInt(cleanCPF[9], 10) && calc(10) === parseInt(cleanCPF[10], 10)
}
