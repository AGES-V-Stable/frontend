import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ComplianceStatusCard } from './ComplianceStatusCard'
import { ComplianceStatus } from './ComplianceStatusType'

describe('ComplianceStatusCard Component', () => {
  it('given status EM_ANALISE, when rendered, then it should display the analysis content', () => {
    render(<ComplianceStatusCard status={ComplianceStatus.EM_ANALISE} />)

    expect(screen.getByText('Em análise')).toBeInTheDocument()
    expect(screen.getByText('Seu cadastro está em análise')).toBeInTheDocument()
    expect(screen.getByText('Análise de compliance em andamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar status' })).toBeInTheDocument()
    expect(screen.getByAltText('svg em análise')).toBeInTheDocument()
  })

  it('given status APROVADO, when rendered, then it should display the approved content', () => {
    render(<ComplianceStatusCard status={ComplianceStatus.APROVADO} />)

    expect(screen.getByText('Aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro aprovado')).toBeInTheDocument()
    expect(screen.getByText('Conta liberada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acessar plataforma' })).toBeInTheDocument()
  })

  it('given status NAO_APROVADO, when rendered, then it should display the not approved content', () => {
    render(<ComplianceStatusCard status={ComplianceStatus.NAO_APROVADO} />)

    expect(screen.getByText('Não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Cadastro não aprovado')).toBeInTheDocument()
    expect(screen.getByText('Ação necessária')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar dados' })).toBeInTheDocument()
  })
})
