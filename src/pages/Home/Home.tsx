import { Button } from '@/components/Button'

function Home() {
  return (
    <div className="p-8 flex flex-col items-center gap-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">V-Stable</h1>
      <h1 className="text-2xl font-bold mb-4">Button Components</h1>
      <div className="w-full flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-600">Primary Button</h2>
        <Button
          label="Continuar"
          variant="primary"
          onClick={() => console.log('Primary clicked')}
        />
      </div>

      <div className="w-full flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-600">Secondary Button</h2>
        <Button
          label="Voltar"
          variant="secondary"
          onClick={() => console.log('Secondary clicked')}
        />
      </div>

      <div className="w-full flex flex-col gap-2 items-center">
        <h2 className="text-sm font-semibold text-gray-600 self-start">Tertiary Button</h2>
        <Button
          label="Esqueci minha senha"
          variant="tertiary"
          onClick={() => console.log('Tertiary clicked')}
        />
      </div>

      <div className="w-full flex flex-col gap-4 mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-sm font-semibold text-gray-600">Disabled States</h2>
        <Button label="Primário Desabilitado" variant="primary" disabled />
        <Button label="Secundário Desabilitado" variant="secondary" disabled />
        <Button label="Terciário Desabilitado" variant="tertiary" disabled />
      </div>
    </div>
  )
}

export { Home }
