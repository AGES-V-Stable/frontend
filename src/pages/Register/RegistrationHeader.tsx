import { Stepper } from '@/components/Stepper'

const steps = ['Acesso', 'Empresa', 'Representante', 'Compliance', 'Conclusão']

interface RegistrationHeaderProps {
  activeStep: 0 | 1 | 2 | 3 | 4
  description?: string
}

export function RegistrationHeader({
  activeStep,
  description = 'Preencha os dados solicitados para concluir o cadastro institucional.',
}: RegistrationHeaderProps) {
  return (
    <>
      <header className="flex flex-col items-center text-center">
        <span className="text-2xl font-bold tracking-widest text-primary">V-STABLE</span>
        <h1 className="mt-2 flex min-h-10 items-center text-2xl font-bold text-slate-900">
          Cadastro Institucional
        </h1>
        <p className="mt-1 flex min-h-7 items-center text-xs text-slate-500">{description}</p>
      </header>

      <Stepper steps={steps} activeStep={activeStep} className="max-w-[1070px]" />
      <hr className="border-sage-300" />
    </>
  )
}
