import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import * as complianceService from '@/services/compliance'
import type { DocumentUploadStartResponse } from '@/types/compliance'

import ComplianceStep from './ComplianceStep'

vi.mock('@/services/compliance', () => ({
  startDocumentUpload: vi.fn(),
  uploadFileToS3: vi.fn(),
  submitDocumentResult: vi.fn(),
}))

function renderComponent(props: React.ComponentProps<typeof ComplianceStep> = {}) {
  return render(<ComplianceStep {...props} />)
}

function makeFile(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type })
}

function mockUploadSuccess(overrides: Partial<DocumentUploadStartResponse> = {}) {
  vi.mocked(complianceService.startDocumentUpload).mockResolvedValue({
    id: 'doc-123',
    uploadUrlFront: 'https://s3/front',
    uploadUrlBack: 'https://s3/back',
    ...overrides,
  })
  vi.mocked(complianceService.uploadFileToS3).mockResolvedValue(undefined)
  vi.mocked(complianceService.submitDocumentResult).mockResolvedValue(undefined)
}

describe('ComplianceStep', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the step title', () => {
    renderComponent()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('renders the step indicator at step 3 of 4', () => {
    renderComponent()
    expect(screen.getByLabelText('Passo 3 de 4')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeInTheDocument()
  })

  it('renders the document type field with identity document options', () => {
    renderComponent()
    const select = screen.getByLabelText(/tipo de documento/i)
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'RG' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CNH' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Passaporte' })).toBeInTheDocument()
  })

  it('renders the Continuar button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument()
  })

  it('shows validation errors on submit with empty form', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('Selecione o tipo de documento')).toBeInTheDocument()
  })

  it('requires exactly two files for a double-sided document (RG)', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'ID')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('frente.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('Envie frente e verso do documento (2 arquivos)')).toBeInTheDocument()
    expect(complianceService.startDocumentUpload).not.toHaveBeenCalled()
  })

  it('requires exactly one file for a single-sided document (Passaporte)', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(screen.getByTestId('file-input'), [
      makeFile('a.pdf', 1024, 'application/pdf'),
      makeFile('b.pdf', 1024, 'application/pdf'),
    ])
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('Envie o arquivo do documento')).toBeInTheDocument()
    expect(complianceService.startDocumentUpload).not.toHaveBeenCalled()
  })

  it('accepts a valid PDF file via the file input', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    await user.upload(input, makeFile('documento.pdf', 1024, 'application/pdf'))

    expect(screen.getByText('documento.pdf')).toBeInTheDocument()
  })

  it('accepts a valid PNG file via the file input', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    await user.upload(input, makeFile('foto.png', 512, 'image/png'))

    expect(screen.getByText('foto.png')).toBeInTheDocument()
  })

  it('rejects a file with an invalid type and shows error', () => {
    renderComponent()

    const dropZone = screen.getByRole('button', { name: /área de upload de documentos/i })
    const file = makeFile(
      'planilha.xlsx',
      1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] as unknown as FileList },
    })

    expect(screen.getByText(/"planilha.xlsx": tipo não permitido/)).toBeInTheDocument()
    expect(screen.queryByText('planilha.xlsx')).not.toBeInTheDocument()
  })

  it('rejects a file exceeding 10 MB and shows error', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    await user.upload(input, makeFile('grande.pdf', 11 * 1024 * 1024, 'application/pdf'))

    expect(screen.getByText(/"grande.pdf": tamanho excede 10 MB/)).toBeInTheDocument()
    expect(screen.queryByText('grande.pdf')).not.toBeInTheDocument()
  })

  it('deduplicates files with the same name and size', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    const file = makeFile('doc.pdf', 2048, 'application/pdf')

    await user.upload(input, file)
    await user.upload(input, file)

    expect(screen.getAllByText('doc.pdf')).toHaveLength(1)
  })

  it('removes a file when its remove button is clicked', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    await user.upload(input, makeFile('remover.pdf', 1024, 'application/pdf'))
    expect(screen.getByText('remover.pdf')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remover remover\.pdf/i }))

    expect(screen.queryByText('remover.pdf')).not.toBeInTheDocument()
  })

  it('accepts files dropped onto the upload area', () => {
    renderComponent()

    const dropZone = screen.getByRole('button', { name: /área de upload de documentos/i })
    const file = makeFile('arrastado.pdf', 1024, 'application/pdf')

    fireEvent.dragOver(dropZone)
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] as unknown as FileList },
    })

    expect(screen.getByText('arrastado.pdf')).toBeInTheDocument()
  })

  it('sets dragging state on dragOver and clears it on dragLeave', () => {
    renderComponent()

    const dropZone = screen.getByRole('button', { name: /área de upload de documentos/i })
    fireEvent.dragOver(dropZone)
    fireEvent.dragLeave(dropZone)

    expect(dropZone).toBeInTheDocument()
  })

  it('uploads front and back to their presigned URLs and shows success for a double-sided document', async () => {
    const user = userEvent.setup()
    mockUploadSuccess()
    renderComponent({ progressoCadastroId: 'cadastro-1' })

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'ID')
    await user.upload(screen.getByTestId('file-input'), [
      makeFile('frente.pdf', 1024, 'application/pdf'),
      makeFile('verso.pdf', 1024, 'application/pdf'),
    ])
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    await waitFor(() => {
      expect(screen.getByText('Formulário enviado com sucesso!')).toBeInTheDocument()
    })
    expect(complianceService.startDocumentUpload).toHaveBeenCalledWith('cadastro-1', 'ID', true)
    expect(complianceService.uploadFileToS3).toHaveBeenNthCalledWith(
      1,
      'https://s3/front',
      expect.objectContaining({ name: 'frente.pdf' }),
    )
    expect(complianceService.uploadFileToS3).toHaveBeenNthCalledWith(
      2,
      'https://s3/back',
      expect.objectContaining({ name: 'verso.pdf' }),
    )
    expect(complianceService.submitDocumentResult).toHaveBeenCalledWith('cadastro-1', 'doc-123')
  })

  it('uploads only the front file for a single-sided document (Passaporte)', async () => {
    const user = userEvent.setup()
    mockUploadSuccess({ uploadUrlBack: null })
    renderComponent({ progressoCadastroId: 'cadastro-1' })

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('passaporte.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    await waitFor(() => {
      expect(screen.getByText('Formulário enviado com sucesso!')).toBeInTheDocument()
    })
    expect(complianceService.startDocumentUpload).toHaveBeenCalledWith(
      'cadastro-1',
      'PASSPORT',
      false,
    )
    expect(complianceService.uploadFileToS3).toHaveBeenCalledTimes(1)
  })

  it('does not show success message when form has validation errors', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.queryByText('Formulário enviado com sucesso!')).not.toBeInTheDocument()
  })

  it('shows an error and does not advance when there is no progresso de cadastro id', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('passaporte.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Recarregue a página')
    expect(complianceService.startDocumentUpload).not.toHaveBeenCalled()
  })

  it('shows an error when the upload fails', async () => {
    const user = userEvent.setup()
    vi.mocked(complianceService.startDocumentUpload).mockRejectedValue(new Error('network error'))
    renderComponent({ progressoCadastroId: 'cadastro-1' })

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('passaporte.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar o documento',
    )
    expect(screen.queryByText('Formulário enviado com sucesso!')).not.toBeInTheDocument()
  })

  it('shows a Continuar action after success and calls onContinue when clicked', async () => {
    const user = userEvent.setup()
    mockUploadSuccess({ uploadUrlBack: null })
    const onContinue = vi.fn()
    renderComponent({ progressoCadastroId: 'cadastro-1', onContinue })

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('passaporte.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    await screen.findByText('Formulário enviado com sucesso!')

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the success Continuar button is clicked without an onContinue handler', async () => {
    const user = userEvent.setup()
    mockUploadSuccess({ uploadUrlBack: null })
    renderComponent({ progressoCadastroId: 'cadastro-1' })

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'PASSPORT')
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('passaporte.pdf', 1024, 'application/pdf'),
    )
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    await screen.findByText('Formulário enviado com sucesso!')

    await expect(
      user.click(screen.getByRole('button', { name: /continuar/i })),
    ).resolves.not.toThrow()
  })

  it('displays the V-STABLE brand header', () => {
    renderComponent()
    expect(screen.getByText('V-STABLE')).toBeInTheDocument()
  })

  it('displays the file upload area with instructions', () => {
    renderComponent()
    expect(
      screen.getByRole('button', { name: /área de upload de documentos/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/pdf, jpg, jpeg ou png/i)).toBeInTheDocument()
  })
})
