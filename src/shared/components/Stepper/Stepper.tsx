interface StepperProps {
  steps: readonly string[]
  /** Índice (base 0) do passo atual. Os anteriores aparecem como concluídos. */
  activeStep: number
  /** Classes extras do contêiner, por exemplo a largura máxima. */
  className?: string
}

export function Stepper({ steps, activeStep, className = '' }: StepperProps) {
  return (
    <ol
      aria-label={`Passo ${activeStep + 1} de ${steps.length}`}
      className={`mx-auto grid w-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
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
  )
}
