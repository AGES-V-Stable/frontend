import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ComplianceFormData, TipoDocumento } from '../types/compliance'
import { startDocumentUpload, submitDocumentResult, uploadFileToS3 } from '../api/compliance'
import { livenessPath } from '@/shared/navigation/paths'

export function useComplianceSubmission(kycVerificationId?: string) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  async function handleContinue(data: ComplianceFormData) {
    if (!kycVerificationId) {
      setServerError(
        'Não foi possível confirmar o cadastro. Recarregue a página e tente novamente.',
      )
      return
    }

    const tipoDocumento = data.tipoDocumento as TipoDocumento
    const doubleSided = tipoDocumento !== 'PASSPORT'
    const [frontFile, backFile] = data.documentos

    if (!frontFile || (doubleSided && !backFile)) {
      setServerError('Selecione os arquivos do documento antes de continuar.')
      return
    }

    setSaving(true)
    setServerError('')
    try {
      const { id, uploadUrlFront, uploadUrlBack } = await startDocumentUpload(
        kycVerificationId,
        tipoDocumento,
        doubleSided,
      )
      await uploadFileToS3(uploadUrlFront, frontFile.file)
      if (doubleSided && uploadUrlBack) {
        await uploadFileToS3(uploadUrlBack, backFile.file)
      }
      await submitDocumentResult(kycVerificationId, id)
      void navigate(livenessPath(kycVerificationId))
    } catch {
      setServerError('Não foi possível enviar o documento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return { saving, serverError, handleContinue }
}
