// src/pages/Register/RepresentativeStep.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepresentativeStep } from './RepresentativeStep';

// Mock do hook de navegação e parâmetros de rota do react-router
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ progresso_cadastro_id: 'cad-123' }),
}));

describe('RepresentativeStep (Etapa 3 - Representante)', () => {
  beforeEach(() => {
    // Limpa chamadas anteriores e prepara o spy no fetch global do ambiente
    vi.clearAllMocks();
    vi.spyOn(window, 'fetch');
  });

  // ---------------------------------------------------------------------------
  // 1. CENÁRIOS DE CARREGAMENTO INICIAL (GET)
  // ---------------------------------------------------------------------------

  it('deve exibir o loading spinner e carregar os dados prévios via GET', async () => {
    // Simula resposta com dados já existentes para testar o pré-preenchimento
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
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
    } as Response);

    render(<RepresentativeStep />);

    // Valida se o feedback visual de carregamento aparece primeiro
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument();

    // Aguarda o término da requisição e verifica preenchimento com máscaras
    await waitFor(() => {
      expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('Diretor(a)');
    });

    expect(screen.getByText(/participação societária: 45%/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('529.982.247-25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90000-000')).toBeInTheDocument();
  });

  it('deve carregar a tela normalmente quando GET 200 não traz dados de representante (branch coverage)', async () => {
    // Testa o branch onde a API responde sucesso, mas o objeto 'representante' não existe
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);

    await waitFor(() => {
      expect(screen.getByLabelText(/cargo \/ função/i)).toHaveValue('');
    });
  });

  it('deve redirecionar para /cadastro com erro se o GET retornar 404 (cadastro expirado)', async () => {
    // Valida o redirecionamento imediato caso a sessão do onboarding não exista
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cadastro', expect.anything());
    });
  });

  it('deve exibir mensagem global se o GET falhar com erro de rede', async () => {
    // Simula falha catastrófica de rede no carregamento
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<RepresentativeStep />);

    await waitFor(() => {
      expect(
        screen.getByText(/não foi possível carregar os dados\. tente novamente\./i)
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. FORMATAÇÃO, MÁSCARAS E VALIDAÇÃO CLIENT-SIDE
  // ---------------------------------------------------------------------------

  it('deve aplicar máscaras e refletir alteração do slider', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument();
    });

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    const cepInput = screen.getByPlaceholderText('00000-000');
    const slider = screen.getByRole('slider');

    // Valida a reatividade do slider de porcentagem
    fireEvent.change(slider, { target: { value: '30' } });
    expect(screen.getByText(/participação societária: 30%/i)).toBeInTheDocument();

    // Valida aplicação dinâmica das máscaras durante a digitação
    await userEvent.type(cpfInput, '52998224725');
    expect(cpfInput).toHaveValue('529.982.247-25');

    await userEvent.type(cepInput, '90000000');
    expect(cepInput).toHaveValue('90000-000');
  });

  it('deve validar CPF no blur e destacar erro client-side', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    
    // Digita um CPF com todos os dígitos iguais (matematicamente inválido)
    await userEvent.type(cpfInput, '11111111111');
    fireEvent.blur(cpfInput);

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument();
  });

  it('não deve exibir erro no blur se o CPF for válido (branch coverage)', async () => {
    // Testa o branch positivo do cálculo do dígito verificador no evento de blur
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    await userEvent.type(cpfInput, '52998224725'); // CPF válido
    fireEvent.blur(cpfInput);

    expect(screen.queryByText(/cpf inválido/i)).not.toBeInTheDocument();
  });

  it('deve exibir erro de validação se o CEP estiver incompleto (branch coverage)', async () => {
    // Testa a condição de tamanho do CEP na validação do formulário
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('00000-000'), '123');
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByText('CEP inválido')).toBeInTheDocument();
  });

  it('deve remover a mensagem de erro do campo ao voltar a digitar (branch coverage)', async () => {
    // Testa o branch do handleInputChange: if (errors[field]) setErrors(...)
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    // Dispara a submissão com campos vazios para levantar os erros
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('Cidade é obrigatória')).toBeInTheDocument();

    // Começa a digitar para cobrir a limpeza seletiva do erro
    const cidadeInput = screen.getByLabelText(/cidade/i);
    await userEvent.type(cidadeInput, 'A');

    expect(screen.queryByText('Cidade é obrigatória')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. NAVEGAÇÃO E SUBMISSÃO (PUT)
  // ---------------------------------------------------------------------------

  it('deve navegar de volta ao clicar em "Voltar" sem disparar PUT', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    const backButton = screen.getByRole('button', { name: /voltar/i });
    fireEvent.click(backButton);

    // Valida navegação para a etapa anterior e ausência de chamadas PUT extras
    expect(mockNavigate).toHaveBeenCalledWith('/cadastro/cad-123/acesso');
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  it('deve submeter o formulário (PUT) com dados limpos e navegar para compliance em sucesso (200)', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response) // Resposta do GET
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Salvo com sucesso' }),
      } as Response); // Resposta do PUT

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    // Preenche todo o formulário com dados válidos
    await userEvent.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Sócio-administrador');
    await userEvent.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '90000000');
    await userEvent.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste, 100');
    await userEvent.type(screen.getByLabelText(/cidade/i), 'São Paulo');
    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'SP');
    await userEvent.type(screen.getByLabelText(/país/i), 'Brasil');

    const submitBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(submitBtn);

    // Valida navegação para a próxima etapa (compliance)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cadastro/cad-123/compliance');
    });

    // Garante que o payload foi enviado com pontuações removidas (desmascarado)
    expect(window.fetch).toHaveBeenLastCalledWith(
      '/v1/cadastros/cad-123/representante',
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
      })
    );
  });

  it('deve mapear erros de validação da API (422) nos campos específicos', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: { cep: 'CEP não encontrado na base dos Correios.' },
        }),
      } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)');
    await userEvent.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '90000000');
    await userEvent.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste');
    await userEvent.type(screen.getByLabelText(/cidade/i), 'São Paulo');
    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'SP');
    await userEvent.type(screen.getByLabelText(/país/i), 'Brasil');

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Confirma que a mensagem vinda do payload da API foi alocada no campo certo
    await waitFor(() => {
      expect(screen.getByText('CEP não encontrado na base dos Correios.')).toBeInTheDocument();
    });
  });

  it('deve tratar erro 422 mesmo se a API não enviar o objeto de erros detalhado (branch coverage)', async () => {
    // Cobre o branch defensivo do fallback `errorData.errors || {}`
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({}),
      } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)');
    await userEvent.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '90000000');
    await userEvent.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste');
    await userEvent.type(screen.getByLabelText(/cidade/i), 'São Paulo');
    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'SP');
    await userEvent.type(screen.getByLabelText(/país/i), 'Brasil');

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled();
    });
  });

  it('deve redirecionar para /cadastro se o PUT retornar 404 (progresso expirado ao salvar)', async () => {
    // Cobre a linha 132 não testada anteriormente: else if (response.status === 404) no PUT
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)');
    await userEvent.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '90000000');
    await userEvent.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste');
    await userEvent.type(screen.getByLabelText(/cidade/i), 'São Paulo');
    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'SP');
    await userEvent.type(screen.getByLabelText(/país/i), 'Brasil');

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cadastro', expect.anything());
    });
  });

  it('deve tratar erro 500 exibindo mensagem de erro global e mantendo dados preenchidos', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    render(<RepresentativeStep />);
    await waitFor(() => expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText(/cargo \/ função/i), 'Diretor(a)');
    await userEvent.type(screen.getByPlaceholderText('000.000.000-00'), '52998224725');
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '90000000');
    await userEvent.type(screen.getByLabelText(/linha de endereço/i), 'Rua Teste');
    await userEvent.type(screen.getByLabelText(/cidade/i), 'São Paulo');
    await userEvent.selectOptions(screen.getByLabelText(/estado/i), 'SP');
    await userEvent.type(screen.getByLabelText(/país/i), 'Brasil');

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/ocorreu um erro ao salvar os dados\. por favor, tente novamente\./i)
      ).toBeInTheDocument();
    });

    // Confirma que os dados foram preservados para nova tentativa do usuário
    expect(screen.getByLabelText(/linha de endereço/i)).toHaveValue('Rua Teste');
  });
});