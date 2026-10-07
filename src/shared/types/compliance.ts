export type TipoDocumento = 'ID' | 'DRIVERS-LICENSE' | 'PASSPORT'

export interface SelectedFile {
  id: string
  file: File
}

export interface ComplianceFormData {
  tipoDocumento: TipoDocumento | ''
  documentos: SelectedFile[]
}

export interface DocumentUploadStartResponse {
  id: string
  uploadUrlFront: string
  uploadUrlBack?: string | null
}
