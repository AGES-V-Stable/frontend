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
  cep: string
  cidade: string
  estado: string
  pais: string
  linha_endereco: string
}

export interface RegistrationProgress {
  token: string
  empresaId: string | null
  etapaAtual: number
  statusGeral?: string
  statusComplianceFinal?: string
}

export interface ComplianceSubmissionResult {
  progresso_cadastro_id: string
  empresa_id: string
  documentos_ids: string[]
  etapa_atual: number
  status_geral: string
  status_compliance_final: string
  atualizado_em: string
}
export interface CompanyRegistrationResult {
  empresa_id: string
  progresso_cadastro_id: string
  etapa_atual: number
  proxima_etapa: string
  atualizado_em: string
}

export interface RepresentativeSubmissionResult {
  empresa_id: string
  progresso_cadastro_id: string
  etapa_atual: number
  proxima_etapa: string
  atualizado_em: string
}
