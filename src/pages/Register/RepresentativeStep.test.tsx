import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RepresentativeStep } from './RepresentativeStep'

const id = 'cad-123'
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

function renderRepresentativeStep(initialEntry = `/cadastro/${id}/representante`) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/cadastro" element={<p>Register page</p>} />
        <Route
          path="/cadastro/:progresso_cadastro_id/representante"
          element={<RepresentativeStep />}
        />
        <Route
          path="/cadastro/:progresso_cadastro_id/compliance"
          element={<p>Compliance page</p>}
        />
        <Route path="/cadastro/:progresso_cadastro_id/acesso" element={<p>Access page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)')
  await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725')
  await user.type(screen.getByPlaceholderText('00000-000'), '90000000')
  await user.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste')
  await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
  await user.selectOptions(screen.getByLabelText(/estado/i), 'SP')
  await user.type(screen.getByLabelText(/país/i), 'Brasil')
}

describe('RepresentativeStep', () => {
  it('shows a loading spinner and preloads existing representative data via GET', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        response({
          representante: {
            cargo_funcao: 'Diretor(a)',
            participacao_societaria: 45,
            cpf: '52998224725',
            cep: '90000000',
            cidade: 'Porto Alegre',
            estado: 'RS',
            pais: 'Brasil',
            linha_endereco: 'Av. Ipiranga, 6681',
          },
        }),
      ),
    )

    renderRepresentativeStep()

    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('Diretor(a)')
    })

    expect(screen.getByText(/participação societária: 45%/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('529.982.247-25')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90000-000')).toBeInTheDocument()
  })

  it('loads normally when GET 200 returns no representative data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()

    await waitFor(() => {
      expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('')
    })
  })

  it('redirects to /cadastro when the GET returns 404 (expired registration)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(null, 404)))

    renderRepresentativeStep()

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('shows a global error message when the GET fails with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

    renderRepresentativeStep()

    expect(
      await screen.findByText(/não foi possível carregar os dados\. tente novamente\./i),
    ).toBeInTheDocument()
  })

  it('applies input masks and reflects slider changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    const cepInput = screen.getByPlaceholderText('00000-000')
    const slider = screen.getByRole('slider')

    // userEvent cannot drive a range input's value directly.
    fireEvent.change(slider, { target: { value: '30' } })
    expect(screen.getByText(/participação societária: 30%/i)).toBeInTheDocument()

    const user = userEvent.setup()
    await user.type(cpfInput, '52998224725')
    expect(cpfInput).toHaveValue('529.982.247-25')

    await user.type(cepInput, '90000000')
    expect(cepInput).toHaveValue('90000-000')
  })

  it('validates the CPF on blur and highlights the client-side error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    const user = userEvent.setup()

    await user.type(cpfInput, '11111111111')
    fireEvent.blur(cpfInput)

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument()
  })

  it('does not show an error on blur when the CPF is valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const cpfInput = screen.getByPlaceholderText('000.000.000-00')
    const user = userEvent.setup()

    await user.type(cpfInput, '52998224725')
    fireEvent.blur(cpfInput)

    expect(screen.queryByText(/cpf inválido/i)).not.toBeInTheDocument()
  })

  it('shows a validation error when the CEP is incomplete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('00000-000'), '123')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('CEP inválido')).toBeInTheDocument()
  })

  it('clears a field error message as the user types again', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({})))

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/cidade/i), 'A')

    expect(screen.queryByText('Cidade é obrigatória')).not.toBeInTheDocument()
  })

  it('shows errors on every required field and does not trigger a PUT when submitting an empty form', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Cargo é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('CPF é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('CEP é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Estado é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('País é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Endereço é obrigatório')).toBeInTheDocument()

    // Only the initial GET happened - no PUT was triggered.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('navigates back when "Voltar" is clicked without triggering a PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /voltar/i }))

    expect(await screen.findByText('Access page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('submits the form (PUT) with sanitized data and navigates to compliance on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ message: 'Salvo com sucesso' }))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Sócio-administrador')
    await user.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725')
    await user.type(screen.getByPlaceholderText('00000-000'), '90000000')
    await user.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste, 100')
    await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
    await user.selectOptions(screen.getByLabelText(/estado/i), 'SP')
    await user.type(screen.getByLabelText(/país/i), 'Brasil')

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Compliance page')).toBeInTheDocument()

    // The payload was sent with the input masks stripped out.
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/v1/cadastros/${id}/representante`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          cargo_funcao: 'Sócio-administrador',
          participacao_societaria: 0,
          cpf: '52998224725',
          cep: '90000000',
          cidade: 'São Paulo',
          estado: 'SP',
          pais: 'Brasil',
          linha_endereco: 'Rua Teste, 100',
        }),
      }),
    )
  })

  it('maps API validation errors (422) to their specific fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(
        response({ errors: { cep: 'CEP não encontrado na base dos Correios.' } }, 422),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('CEP não encontrado na base dos Correios.')).toBeInTheDocument()
  })

  it('handles a 422 error even when the API sends no detailed errors object', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}, 422))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled()
    })
  })

  it('redirects to /cadastro when the PUT returns 404 (expired progress)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response(null, 404))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByText('Register page')).toBeInTheDocument()
  })

  it('handles a 500 error by showing a global error message and preserving filled-in data', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response(null, 500))
    vi.stubGlobal('fetch', fetchMock)

    renderRepresentativeStep()
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument())

    const user = userEvent.setup()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(
      await screen.findByText(/ocorreu um erro ao salvar os dados\. por favor, tente novamente\./i),
    ).toBeInTheDocument()

    // The entered data is preserved for a retry.
    expect(screen.getByLabelText(/linha de endereço/i)).toHaveValue('Rua Teste')
  })
})
