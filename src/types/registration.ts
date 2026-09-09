export interface CompanyData {
  razaoSocial: string
  pais: string
  cnpj: string
  cep: string
  cidade: string
  estado: string
}
export interface RegistrationProgress {
  token: string
  empresaId: string | null
  etapaAtual: number
}
export interface CompanyRegistrationResult {
  empresa_id: string
  progresso_cadastro_id: string
  etapa_atual: number
  proxima_etapa: string
  atualizado_em: string
}
