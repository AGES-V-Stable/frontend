import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { PATHS } from '@/routes/paths'

import RegistrationComplete from './RegistrationComplete'

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/register/some-id/concluido']}>
      <Routes>
        <Route path={PATHS.HOME} element={<p>Home</p>} />
        <Route path={PATHS.REGISTER_COMPLETE} element={<RegistrationComplete />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegistrationComplete Page Component', () => {
  it('given the registration is complete, when the page is rendered, then it should show the confirmation message', () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: 'Cadastro enviado' })).toBeInTheDocument()
    expect(screen.getByText(/nossa equipe de compliance vai analisar/i)).toBeInTheDocument()
  })

  it('given the confirmation page, when the user clicks the button, then it should navigate back to the home route', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: 'Voltar para o início' }))

    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
