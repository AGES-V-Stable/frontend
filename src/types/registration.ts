export interface AccessData {
  nomeCompleto: string
  email: string
  senha: string
  confirmarSenha: string
}

export interface CompanyData {
  razaoSocial: string
  pais: string
  cnpj: string
  cep: string
  cidade: string
  estado: string
}

export interface RepresentativeData {
  cargo_funcao: string
  participacao_societaria: number
  cpf: string
  date_of_birth: string
  phone: string
  cep: string
  cidade: string
  estado: string
  pais: string
  linha_endereco: string
}
