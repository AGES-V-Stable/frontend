export type TipoDocumento =
  'CONTRATO_SOCIAL' | 'COMPROVANTE_ENDERECO' | 'DOCUMENTO_REPRESENTANTE' | 'OUTROS'

export interface SelectedFile {
  id: string
  file: File
}

export interface ComplianceFormData {
  tipoDocumento: TipoDocumento | ''
  documentos: SelectedFile[]
}
