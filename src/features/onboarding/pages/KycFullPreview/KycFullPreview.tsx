import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { CompanyStep } from '@/features/onboarding/pages/Register/CompanyStep'
import { RepresentativeStep } from '@/features/onboarding/pages/Register/RepresentativeStep'
import ComplianceStep from '@/features/onboarding/pages/Register/ComplianceStep'
import { BlindPayComplement } from '@/features/onboarding/pages/BlindPayComplement/BlindPayComplement'
import { BlindPayIndividualKyc } from '@/features/onboarding/pages/BlindPayIndividualKyc/BlindPayIndividualKyc'
import { RegistrationHeader } from '@/features/onboarding/pages/Register/RegistrationHeader'

const SCREENS = [
  'Acesso',
  'Empresa',
  'Representante',
  'Documentos Avenia',
  'Verificação facial',
  'Complementação BlindPay',
  'KYC BlindPay (individual)',
] as const

type ScreenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * Rota exclusivamente de desenvolvimento para revisar o percurso visual de KYC.
 * Componentes reais são reaproveitados; callbacks substituem todas as submissões
 * para não criar contas, não chamar Avenia e não enviar arquivos à BlindPay.
 */
export function KycFullPreview() {
  const [step, setStep] = useState<ScreenIndex>(0)

  function navigateTo(index: number) {
    if (index >= 0 && index < SCREENS.length) setStep(index as ScreenIndex)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav
        aria-label="Navegação da prévia de KYC"
        className="sticky top-0 z-20 border-b border-sage-300 bg-white px-4 py-3 shadow-sm"
      >
        <div className="mx-auto max-w-[1300px] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-slate-900">Prévia local · Jornada de KYC</strong>
            <span className="text-xs font-medium text-amber-700">
              Ambiente de teste: nada será enviado
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCREENS.map((name, index) => (
              <button
                key={name}
                type="button"
                aria-current={step === index ? 'step' : undefined}
                onClick={() => navigateTo(index)}
                className={
                  'rounded-lg border px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-primary ' +
                  (step === index
                    ? 'border-primary bg-emerald-50 text-primary'
                    : 'border-sage-300 bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                {index + 1}. {name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {step === 0 && (
        <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
          <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-8 md:px-10">
            <RegistrationHeader
              activeStep={0}
              description="Prévia da etapa de criação de acesso, sem cadastro real."
            />
            <div className="mx-auto grid w-full max-w-xl gap-4 py-4">
              <h2 className="text-xl font-bold text-slate-900">Dados de acesso</h2>
              <Input label="Nome completo" placeholder="Nome do representante" />
              <Input label="E-mail" type="email" placeholder="nome@empresa.com.br" />
              <Input label="Senha" type="password" placeholder="Senha de demonstração" />
              <Input label="Confirmar senha" type="password" placeholder="Repita a senha" />
              <Button label="Próxima tela" onClick={() => navigateTo(1)} />
            </div>
          </div>
        </main>
      )}

      {step === 1 && (
        <CompanyStep onCancel={() => navigateTo(0)} onContinue={() => navigateTo(2)} />
      )}

      {step === 2 && <RepresentativeStep onContinue={() => navigateTo(3)} />}

      {step === 3 && (
        <ComplianceStep
          onContinue={async () => {
            navigateTo(4)
          }}
        />
      )}

      {step === 4 && (
        <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
          <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 rounded-xl border border-sage-300 bg-white px-4 py-8 md:px-10">
            <RegistrationHeader
              activeStep={3}
              description="A validação facial real acontece no ambiente da Avenia."
            />
            <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-8 text-center">
              <h2 className="text-xl font-bold text-slate-900">Verificação facial (Avenia)</h2>
              <p className="text-sm leading-6 text-slate-600">
                No fluxo real, o usuário inicia a verificação facial pela Avenia e retorna para
                consultar a conclusão. Esta prévia não inicia liveness nem gera um ID de
                verificação.
              </p>
              <div
                role="status"
                className="w-full rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-700"
              >
                Simulação visual: nenhuma verificação de identidade foi realizada.
              </div>
              <Button label="Visualizar complementação BlindPay" onClick={() => navigateTo(5)} />
            </section>
          </div>
        </main>
      )}

      {step === 6 && <BlindPayIndividualKyc previewOnly />}
      {step === 5 && (
        <div>
          <div className="mx-auto max-w-[1300px] px-4 pt-5 text-sm text-slate-600 md:px-8">
            Campos adicionais do representante. O backend atual da BlindPay opera o onboarding KYB
            empresarial; esta prévia não equivale a um KYC individual enviado.
          </div>
          <BlindPayComplement />
        </div>
      )}
    </div>
  )
}
