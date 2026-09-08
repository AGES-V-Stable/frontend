import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import ComplianceStep from './ComplianceStep'

function renderComponent() {
  return render(<ComplianceStep />)
}

function makeFile(name: string, size: number, type: string): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('ComplianceStep', () => {
  it('renders the step title', () => {
    renderComponent()
    expect(screen.getByText('Compliance e documentos')).toBeInTheDocument()
  })

  it('renders the step indicator at step 3', () => {
    renderComponent()
    expect(screen.getByLabelText('Passo 3 de 3')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeInTheDocument()
  })

  it('renders all 4 form fields', () => {
    renderComponent()
    expect(screen.getByLabelText(/tipo de documento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome do representante legal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^cargo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cpf do representante/i)).toBeInTheDocument()
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
    expect(screen.getByText('Nome do representante é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Cargo é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('CPF é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Envie pelo menos um documento')).toBeInTheDocument()
  })

  it('shows CPF format error when CPF is incomplete', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByLabelText(/cpf do representante/i), '123456')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('CPF deve conter 11 dígitos')).toBeInTheDocument()
  })

  it('formats CPF as digits are typed', async () => {
    const user = userEvent.setup()
    renderComponent()

    const cpfInput = screen.getByLabelText(/cpf do representante/i)
    await user.type(cpfInput, '12345678901')

    expect(cpfInput).toHaveValue('123.456.789-01')
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

  it('shows success message when form is fully valid and submitted', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CONTRATO_SOCIAL')
    await user.type(screen.getByLabelText(/nome do representante legal/i), 'João da Silva')
    await user.type(screen.getByLabelText(/^cargo/i), 'Sócio-Administrador')
    await user.type(screen.getByLabelText(/cpf do representante/i), '12345678901')

    await user.upload(
      screen.getByTestId('file-input'),
      makeFile('contrato.pdf', 1024, 'application/pdf'),
    )

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Formulário enviado com sucesso!')).toBeInTheDocument()
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
})
