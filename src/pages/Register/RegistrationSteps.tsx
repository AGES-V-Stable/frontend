const STEPS = ['Representante', 'Empresa', 'Compliance', 'Conclusão']

export interface RegistrationStepsProps {
  currentIndex: number
}

export function RegistrationSteps({ currentIndex }: RegistrationStepsProps) {
  return (
    <ol aria-label="Etapas do cadastro" className="mx-auto grid w-full max-w-[1070px] grid-cols-4">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === currentIndex ? 'step' : undefined}
          className="relative flex flex-col items-center gap-1.5"
        >
          {index < 3 && (
            <span
              aria-hidden="true"
              className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-[17px] h-0.5 md:left-[calc(50%+31px)] md:right-[calc(-50%+31px)] ${index < currentIndex ? 'bg-[#059669]' : 'bg-[#BBCABF]'}`}
            />
          )}
          <span className="relative flex size-9 items-center justify-center">
            <img
              alt=""
              src={`/images/register/step-${index < currentIndex ? 'completed' : index === currentIndex ? 'active' : 'pending'}.svg`}
              className="absolute inset-0 size-9"
            />
            <span
              className={`relative text-sm font-medium ${index === currentIndex ? 'text-white' : index < currentIndex ? 'text-[#059669]' : 'text-[#64748B]'}`}
            >
              {index + 1}
            </span>
          </span>
          <span
            className={`flex min-h-6 items-center text-[10px] sm:text-xs ${index <= currentIndex ? 'text-[#059669]' : 'text-[#64748B]'}`}
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  )
}
