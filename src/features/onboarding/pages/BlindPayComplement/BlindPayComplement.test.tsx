import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/http/httpClient'
import {
  loadIndividualKycStatus,
  checkIndividualTermsReturn,
  startIndividualKycTerms,
  submitIndividualKyc,
  restartIndividualKyc,
  loadIndividualKycRfi,
  submitIndividualKycRfi,
} from '@/features/onboarding/api/blindpayIndividualKyc'
import { BlindPayComplement } from './BlindPayComplement'
import { describeKycStatus, isKycPending, kycErrorMessage } from './kycStatus'
import {
  EMPTY_PERSONAL_DATA,
  isValidCpf,
  validateBlindPayUpload,
  validatePersonalData,
} from './validation'

vi.mock('@/features/onboarding/api/blindpayIndividualKyc', () => ({
  loadIndividualKycStatus: vi.fn(),
  captureIndividualTermsReturn: vi.fn(),
  checkIndividualTermsReturn: vi.fn(),
  startIndividualKycTerms: vi.fn(),
  submitIndividualKyc: vi.fn(),
  restartIndividualKyc: vi.fn(),
  loadIndividualKycRfi: vi.fn(),
  submitIndividualKycRfi: vi.fn(),
  uploadIndividualKycRfiDocument: vi.fn(),
}))

const image = (name: string) => new File(['jpeg'], name, { type: 'image/jpeg' })
const pdf = (name: string) => new File(['pdf'], name, { type: 'application/pdf' })

const notStarted = { termsAccepted: false, submitted: false, kycStatus: null, amlStatus: null }
const termsDone = { ...notStarted, termsAccepted: true }

async function fillPersonalData(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Nome *'), 'Joana')
  await user.type(screen.getByLabelText('Sobrenome *'), 'Silva')
  fireEvent.change(screen.getByLabelText('Data de nascimento *'), {
    target: { value: '1994-05-12' },
  })
  await user.type(screen.getByLabelText('CPF *'), '52998224725')
  await user.type(screen.getByLabelText('Celular *'), '51999998888')
  await user.type(screen.getByLabelText('CEP *'), '90010000')
  await user.type(screen.getByLabelText('Endereço e número *'), 'Rua Exemplo, 100')
  await user.type(screen.getByLabelText('Cidade *'), 'Porto Alegre')
  await user.selectOptions(screen.getByLabelText('Estado *'), 'RS')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

async function fillDocumentsAndAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText('Selecionar frente do documento'), image('rg-frente.jpg'))
  await user.upload(screen.getByLabelText('Selecionar verso do documento'), image('rg-verso.jpg'))
  await user.upload(screen.getByLabelText('Selecionar selfie'), image('selfie.jpg'))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))

  expect(screen.getByRole('heading', { name: 'Comprovante de endereço' })).toBeInTheDocument()
  await user.selectOptions(
    screen.getByLabelText('Tipo de comprovante de endereço *'),
    'electricity',
  )
  await user.upload(screen.getByLabelText('Selecionar comprovante de endereço'), pdf('conta.pdf'))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

beforeEach(() => {
  vi.mocked(loadIndividualKycStatus).mockReset()
  vi.mocked(startIndividualKycTerms).mockReset()
  vi.mocked(submitIndividualKyc).mockReset()
  vi.mocked(restartIndividualKyc).mockReset()
  vi.mocked(loadIndividualKycRfi).mockReset()
  vi.mocked(submitIndividualKycRfi).mockReset()
})

describe('validation', () => {
  it('accepts only images for ID and selfie and PDF for proof of address', () => {
    expect(validateBlindPayUpload(pdf('documento.pdf'), 'selfie')).toMatch(/JPG ou PNG/)
    expect(validateBlindPayUpload(pdf('rg.pdf'), 'idDocument')).toMatch(/documento/)
    expect(
      validateBlindPayUpload(new File([], 'selfie.png', { type: 'image/png' }), 'selfie'),
    ).toMatch(/vazio/)
    expect(
      validateBlindPayUpload(
        new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'comprovante.pdf', {
          type: 'application/pdf',
        }),
        'proof',
      ),
    ).toMatch(/3 MB/)
    expect(validateBlindPayUpload(image('selfie.jpg'), 'selfie')).toBeNull()
    expect(validateBlindPayUpload(pdf('comprovante.pdf'), 'proof')).toBeNull()
  })

  it('validates CPF check digits like the backend', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224726')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('rejects future birth dates, short phones and incomplete CEP', () => {
    const errors = validatePersonalData(
      {
        ...EMPTY_PERSONAL_DATA,
        firstName: 'Joana',
        lastName: 'Silva',
        dateOfBirth: '2030-01-01',
        cpf: '529.982.247-25',
        phone: '(51) 9999',
        postalCode: '9001',
        addressLine1: 'Rua Exemplo, 100',
        city: 'Porto Alegre',
        state: 'RS',
      },
      new Date('2026-11-14T12:00:00Z'),
    )
    expect(Object.keys(errors).sort()).toEqual(['dateOfBirth', 'phone', 'postalCode'])
  })
})

describe('kycStatus', () => {
  it('only treats approval with clear AML as fully released', () => {
    const approved = {
      termsAccepted: true,
      submitted: true,
      kycStatus: 'approved',
      amlStatus: 'clear',
    }
    expect(describeKycStatus(approved).tone).toBe('success')
    expect(describeKycStatus({ ...approved, amlStatus: null }).tone).toBe('warning')
    expect(describeKycStatus({ ...approved, kycStatus: 'rejected' }).tone).toBe('danger')
    expect(isKycPending({ ...approved, kycStatus: 'verifying' })).toBe(true)
    expect(isKycPending(approved)).toBe(false)
  })

  it('translates backend errors without leaking details', () => {
    expect(kycErrorMessage(new HttpError('x', 503), 'f')).toMatch(/não está habilitada/)
    expect(kycErrorMessage(new HttpError('x', 409), 'f')).toMatch(/Já existe/)
    expect(kycErrorMessage(new HttpError('x', 500), 'fallback')).toBe('fallback')
    expect(kycErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})

describe('manual status checks', () => {
  it('checks completion on click without starting a polling timer', async () => {
    const interval = vi.spyOn(window, 'setInterval')
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      ...termsDone,
      submitted: true,
      kycStatus: 'verifying',
    })
    const user = userEvent.setup()
    render(<BlindPayComplement />)
    await screen.findByRole('button', { name: 'Verificar conclusão' })
    expect(loadIndividualKycStatus).toHaveBeenCalledTimes(1)
    expect(interval.mock.calls.some(([, delay]) => Number(delay) >= 1000)).toBe(false)
    interval.mockRestore()
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      ...termsDone,
      submitted: true,
      kycStatus: 'approved',
      amlStatus: 'clear',
    })

    await user.click(screen.getByRole('button', { name: 'Verificar conclusão' }))

    await waitFor(() => expect(screen.getByText('Identidade aprovada')).toBeInTheDocument())
    expect(checkIndividualTermsReturn).toHaveBeenCalled()
    expect(loadIndividualKycStatus).toHaveBeenCalledTimes(2)
  })
})

describe('BlindPayComplement (prévia)', () => {
  it('allows postponing the complement to continue using the platform', async () => {
    const onPostpone = vi.fn()
    const user = userEvent.setup()
    render(<BlindPayComplement previewOnly onPostpone={onPostpone} />)

    await user.click(screen.getByRole('button', { name: 'Fazer mais tarde' }))

    expect(onPostpone).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/retomar esta verificação pelo Dashboard/)).toBeInTheDocument()
  })

  it('shows required validation without leaving the personal data step', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement previewOnly />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getAllByText('Campo obrigatório.').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Dados pessoais do titular' })).toBeInTheDocument()
    expect(loadIndividualKycStatus).not.toHaveBeenCalled()
  })

  it('requires the back of the ID card but not of the passport', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement previewOnly />)
    await fillPersonalData(user)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Envie o verso do documento.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Tipo de documento *'), 'PASSPORT')
    expect(screen.queryByLabelText('Selecionar verso do documento')).not.toBeInTheDocument()
  })

  it('navigates every step and keeps submission disabled', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement previewOnly />)

    await fillPersonalData(user)
    expect(
      screen.getByRole('heading', { name: 'Documento de identificação e selfie' }),
    ).toBeInTheDocument()
    await fillDocumentsAndAddress(user)

    expect(screen.getByRole('heading', { name: 'Aceite dos termos BlindPay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /indisponível na prévia/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Ver revisão' }))

    expect(screen.getByRole('heading', { name: 'Revisão das informações' })).toBeInTheDocument()
    expect(screen.getByText('Conta de energia')).toBeInTheDocument()
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument()
    expect(
      screen.getByText('rg-frente.jpg, rg-verso.jpg, selfie.jpg, conta.pdf'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envio desativado na prévia' })).toBeDisabled()
  })

  it('returns to the previous step without losing entered data', async () => {
    const user = userEvent.setup()
    render(<BlindPayComplement previewOnly />)
    await fillPersonalData(user)
    await user.upload(screen.getByLabelText('Selecionar selfie'), image('selfie.jpg'))

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByLabelText('Nome *')).toHaveValue('Joana')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('selfie.jpg')).toBeInTheDocument()
  })
})

describe('BlindPayComplement (integração)', () => {
  it('blocks the review until BlindPay confirms the hosted terms', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue(notStarted)
    vi.mocked(startIndividualKycTerms).mockResolvedValue(
      'https://app.blindpay.com/e/terms-of-service?x=1',
    )
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await fillPersonalData(user)
    await fillDocumentsAndAddress(user)
    await user.click(screen.getByRole('button', { name: 'Ver revisão' }))
    expect(screen.getByText(/Conclua o aceite/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Gerar link dos termos' }))
    expect(
      await screen.findByRole('link', { name: 'Abrir termos no site da BlindPay' }),
    ).toHaveAttribute('href', 'https://app.blindpay.com/e/terms-of-service?x=1')

    vi.mocked(loadIndividualKycStatus).mockResolvedValue(termsDone)
    await user.click(screen.getByRole('button', { name: 'Já aceitei, verificar' }))
    expect(await screen.findByText('Aceite confirmado pela BlindPay.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver revisão' }))
    expect(screen.getByRole('heading', { name: 'Revisão das informações' })).toBeInTheDocument()
  })

  it('submits the profile in the BlindPay format and shows the review status', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue(termsDone)
    vi.mocked(submitIndividualKyc).mockResolvedValue({
      termsAccepted: true,
      submitted: true,
      kycStatus: 'verifying',
      amlStatus: null,
    })
    const user = userEvent.setup()
    render(<BlindPayComplement />)
    await waitFor(() => expect(screen.getByLabelText('Nome *')).toBeInTheDocument())

    await fillPersonalData(user)
    await fillDocumentsAndAddress(user)
    await user.click(screen.getByRole('button', { name: 'Ver revisão' }))
    const send = screen.getByRole('button', { name: 'Enviar para BlindPay' })
    expect(send).toBeDisabled()
    await user.click(screen.getByRole('checkbox'))
    await user.click(send)

    expect(await screen.findByText('Verificação em análise')).toBeInTheDocument()
    const [profile, files] = vi.mocked(submitIndividualKyc).mock.calls[0]
    expect(profile).toEqual({
      firstName: 'Joana',
      lastName: 'Silva',
      dateOfBirth: '1994-05-12',
      taxId: '52998224725',
      phoneNumber: '+5551999998888',
      addressLine1: 'Rua Exemplo, 100',
      addressLine2: null,
      city: 'Porto Alegre',
      stateProvinceRegion: 'Rio Grande do Sul',
      postalCode: '90010000',
      country: 'BR',
      idDocCountry: 'BR',
      idDocType: 'ID_CARD',
      proofOfAddressDocType: 'UTILITY_BILL',
    })
    expect(files.idFront.name).toBe('rg-frente.jpg')
    expect(files.idBack?.name).toBe('rg-verso.jpg')
    expect(files.proofAddress?.name).toBe('conta.pdf')
  })

  it('shows the current situation instead of the form after submission', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      termsAccepted: true,
      submitted: true,
      kycStatus: 'rejected',
      amlStatus: null,
    })
    render(<BlindPayComplement />)

    expect(await screen.findByText('Verificação recusada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
  })

  it('explains when the integration is disabled in the environment', async () => {
    vi.mocked(loadIndividualKycStatus).mockRejectedValue(new HttpError('x', 503))
    render(<BlindPayComplement />)

    expect(await screen.findByText(/não está habilitada neste ambiente/)).toBeInTheDocument()
  })

  it('lets a rejected holder correct the data and start a new registration', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      termsAccepted: true,
      submitted: true,
      kycStatus: 'rejected',
      amlStatus: null,
    })
    vi.mocked(restartIndividualKyc).mockResolvedValue(notStarted)
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await user.click(
      await screen.findByRole('button', { name: 'Corrigir dados e enviar novo cadastro' }),
    )

    expect(restartIndividualKyc).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole('heading', { name: 'Dados pessoais do titular' }),
    ).toBeInTheDocument()
  })

  it('answers the BlindPay information request from the status screen', async () => {
    vi.mocked(loadIndividualKycStatus).mockResolvedValue({
      termsAccepted: true,
      submitted: true,
      kycStatus: 'compliance_request',
      amlStatus: null,
    })
    vi.mocked(loadIndividualKycRfi).mockResolvedValue({
      open: true,
      rfiId: 'rfi_1',
      expiresAt: null,
      sections: [
        {
          title: 'Perfil',
          description: null,
          supportingDocument: null,
          fields: [
            {
              key: 'occupation',
              label: 'Ocupação',
              required: true,
              multiple: false,
              documentType: null,
              options: [],
            },
          ],
        },
      ],
    })
    vi.mocked(submitIndividualKycRfi).mockResolvedValue({
      termsAccepted: true,
      submitted: true,
      kycStatus: 'verifying',
      amlStatus: null,
    })
    const user = userEvent.setup()
    render(<BlindPayComplement />)

    await user.click(await screen.findByRole('button', { name: 'Enviar informações' }))
    expect(screen.getByText('Campo obrigatório.')).toBeInTheDocument()
    expect(submitIndividualKycRfi).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Ocupação *'), 'Engenheira')
    await user.click(screen.getByRole('button', { name: 'Enviar informações' }))

    expect(submitIndividualKycRfi).toHaveBeenCalledWith({ occupation: 'Engenheira' })
    expect(await screen.findByText('Verificação em análise')).toBeInTheDocument()
  })
})
