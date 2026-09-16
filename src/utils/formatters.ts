export const formatCurrency = (value: number, currencyCode: string) => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currencyCode} ${formatter.format(value)}`
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  if (isNaN(date.getTime())) return dateString

  return `${day} ${month} ${year}`
}

