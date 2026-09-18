import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ComplianceStep from './ComplianceStep'

function renderComponent(onContinue = vi.fn(async () => undefined)) {
  return render(<ComplianceStep onContinue={onContinue} />)
}

function makeFile(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('ComplianceStep', () => {
  it('renders the step title', () => {
    renderComponent()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('renders the step indicator at step 4 of 5', () => {
    renderComponent()
    expect(screen.getByLabelText('Passo 4 de 5')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeInTheDocument()
  })

  it('renders the document type field', () => {
    renderComponent()
    expect(screen.getByLabelText(/tipo de documento/i)).toBeInTheDocument()
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
    expect(screen.getByText('Envie pelo menos um documento')).toBeInTheDocument()
  })

  it('accepts a valid PDF file via the file input', async () => {
    const user = userEvent.setup()
    renderComponent()

    const input = screen.getByTestId('file-input')
    await user.upload(input, makeFile('contrato.pdf', 1024, 'application/pdf'))

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument()
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

  it('submits the selected documents when the form is valid', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn(async () => undefined)
    renderComponent(onContinue)

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CONTRATO_SOCIAL')

    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('contrato.pdf', 1024, 'application/pdf'),
    )

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({ tipoDocumento: 'CONTRATO_SOCIAL' }),
    )
  })

  it('does not show success message when form has validation errors', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.queryByText('Formulário enviado com sucesso!')).not.toBeInTheDocument()
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

  it('disables interactions and displays the server error while saving', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn(async () => undefined)
    const { rerender } = renderComponent(onContinue)
    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('contrato.pdf', 2 * 1024 * 1024, 'application/pdf'),
    )

    rerender(
      <ComplianceStep onContinue={onContinue} saving serverError="Não foi possível enviar" />,
    )

    expect(screen.getByLabelText(/tipo de documento/i)).toBeDisabled()
    expect(screen.getByTestId('file-input')).toBeDisabled()
    expect(screen.getByRole('button', { name: /remover contrato.pdf/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviando documentos...' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível enviar')
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('opens the file picker from the keyboard when enabled', () => {
    renderComponent()
    const input = screen.getByTestId('file-input')
    const click = vi.spyOn(input, 'click')
    const dropZone = screen.getByRole('button', { name: /área de upload de documentos/i })

    fireEvent.keyDown(dropZone, { key: 'Enter' })
    fireEvent.keyDown(dropZone, { key: ' ' })

    expect(click).toHaveBeenCalledTimes(2)
  })
})
