export type TipoDocumento =
  | 'CONTRATO_SOCIAL'
  | 'COMPROVANTE_ENDERECO'
  | 'DOCUMENTO_REPRESENTANTE'
  | 'OUTROS'

export interface SelectedFile {
  id: string
  file: File
}

export interface ComplianceFormData {
  tipoDocumento: TipoDocumento | ''
  nomeRepresentante: string
  cargo: string
  cpfRepresentante: string
  documentos: SelectedFile[]
}
