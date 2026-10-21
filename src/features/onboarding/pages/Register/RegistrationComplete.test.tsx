import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { PATHS } from '@/shared/navigation/paths'
import RegistrationComplete from '@/features/onboarding/pages/Register/RegistrationComplete'

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/register/some-id/concluido']}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home</p>} />
        <Route path={PATHS.REGISTER_STATUS} element={<p>Status Page</p>} />
        <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegistrationComplete Page Component', () => {
  it('given the registration is complete, when the page is rendered, then it should show the confirmation message and action buttons', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Cadastro enviado' })).toBeInTheDocument()
    expect(screen.getByText(/nossa equipe de compliance vai analisar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acompanhar status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar para o início' })).toBeInTheDocument()
  })

  it('navigates to status page when clicking Acompanhar status', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: 'Acompanhar status' }))
    expect(screen.getByText('Status Page')).toBeInTheDocument()
  })

  it('navigates back to home route when clicking Voltar para o início', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: 'Voltar para o início' }))
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
