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
