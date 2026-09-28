import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ComplianceStatusCard } from './ComplianceStatusCard'
import { ComplianceStatus } from './ComplianceStatusType'

function renderCard(status: ComplianceStatus) {
  return render(
    <MemoryRouter>
      <ComplianceStatusCard status={status} />
    </MemoryRouter>,
  )
}

describe('ComplianceStatusCard Component', () => {
  it('given status IN_REVIEW, when rendered, then it should display the analysis content', () => {
    renderCard(ComplianceStatus.IN_REVIEW)

    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(screen.getByText('Análise de compliance em andamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar status' })).toBeInTheDocument()
    expect(screen.getByAltText('svg em análise')).toBeInTheDocument()
  })

  it('given status APPROVED, when rendered, then it should display the approved content', () => {
    renderCard(ComplianceStatus.APPROVED)

    expect(screen.getByText('Aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro aprovado')).toBeInTheDocument()
    expect(screen.getByText('Conta liberada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acessar plataforma' })).toBeInTheDocument()
  })

  it('given status NOT_APPROVED, when rendered, then it should display the not approved content', () => {
    renderCard(ComplianceStatus.NOT_APPROVED)

    expect(screen.getByText('Não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Ação necessária')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar dados' })).toBeInTheDocument()
  })
})
