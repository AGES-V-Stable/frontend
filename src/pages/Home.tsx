import { useState } from 'react'
import { Drawer } from '@/components/Drawer/Drawer'
import { Button } from '@/components/Button'

function Home() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      <Drawer
        open={isDrawerOpen}
        title="Detalhes da transferência"
        onClose={() => setIsDrawerOpen(false)}
        actions={[
          {
            label: 'Cancelar',
            variant: 'secondary',
            onClick: () => setIsDrawerOpen(false),
          },
          {
            label: 'Confirmar',
            variant: 'primary',
            onClick: () => {},
          },
        ]}
      >
        <div className="flex flex-col gap-[24px]">
          <div>
            <span className="text-[14px] text-gray-500">Destinatário</span>
            <p className="text-[16px] text-gray-900">João da Silva</p>
          </div>

          <div>
            <span className="text-[14px] text-gray-500">Valor</span>
            <p className="text-[16px] font-medium text-gray-900">R$ 150,00</p>
          </div>

          <div className="rounded-[8px] border border-gray-200 p-[16px]">
            <span className="text-[14px] text-gray-500">Status</span>
            <p className="mt-[4px] text-[16px] font-medium text-[#059669]">Concluído</p>
          </div>
        </div>
      </Drawer>
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
        <div className="w-full flex flex-col gap-4 mt-8 pt-8 border-t border-gray-200">
          <Button label="Open Drawer" onClick={() => setIsDrawerOpen(true)} />
        </div>
      </div>
    </>
  )
}

export default Home
