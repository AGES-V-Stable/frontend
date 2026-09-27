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

      <ol
        aria-label={`Passo ${activeStep + 1} de ${steps.length}`}
        className="mx-auto grid w-full max-w-[1070px] grid-cols-5"
      >
        {steps.map((step, index) => {
          const completed = index < activeStep
          const active = index === activeStep

          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="relative flex flex-col items-center gap-1.5"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-[17px] h-0.5 md:left-[calc(50%+31px)] md:right-[calc(-50%+31px)] ${completed ? 'bg-primary' : 'bg-sage-300'}`}
                />
              )}
              <span
                className={`relative flex size-9 items-center justify-center rounded-full border-2 text-sm font-medium ${
                  completed
                    ? 'border-primary bg-emerald-50 text-primary'
                    : active
                      ? 'border-primary bg-primary text-white'
                      : 'border-sage-300 bg-white text-slate-500'
                }`}
              >
                {completed ? '✓' : index + 1}
              </span>
              <span
                className={`flex min-h-6 items-center text-[10px] sm:text-xs ${
                  index <= activeStep ? 'text-primary' : 'text-slate-500'
                }`}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
      <hr className="border-sage-300" />
    </>
  )
}
