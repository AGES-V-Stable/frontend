import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MemberTable } from '@/features/members/components/MemberTable'
import type { MemberListItem } from '@/features/members/schemas/members'

const owner: MemberListItem = {
  kind: 'MEMBER',
  member: {
    id: 'membership-1',
    userId: 'user-1',
    companyId: 'company-1',
    name: 'Marina Costa',
    email: 'marina@example.test',
    role: 'OWNER',
    status: 'ACTIVE',
    version: 1,
    joinedAt: '2026-11-01T12:00:00Z',
    removedAt: null,
  },
}

const renderTable = () =>
  render(
    <MemberTable
      items={[owner]}
      peopleCount={1}
      viewer={{ userId: 'user-1', membershipId: 'membership-1' }}
      onManage={vi.fn()}
      onCopyInvitationLink={vi.fn()}
      onManageInvitation={vi.fn()}
      footer={<p>Sua equipe começa aqui</p>}
    />,
  )

describe('MemberTable', () => {
  it('keeps the title, the count and the footer inside one bordered card', () => {
    // Given a lista só com a proprietária
    renderTable()

    // Then o cartão tem borda e reúne título, contagem, linhas e rodapé
    const card = screen.getByRole('region', { name: 'Pessoas com acesso' })
    expect(card).toHaveClass('border', 'border-sage-300')
    expect(
      within(card).getByText('1 membro · Gestão exclusiva do proprietário'),
    ).toBeInTheDocument()
    expect(within(card).getByRole('table')).toBeInTheDocument()
    expect(within(card).getByText('Sua equipe começa aqui')).toBeInTheDocument()
  })

  it('gives the rows the same side inset as the title, so they do not touch the card edge', () => {
    // Given a lista só com a proprietária
    renderTable()

    // Then o título e a área das linhas ficam dentro de blocos com o mesmo recuo
    const title = screen.getByRole('heading', { name: 'Pessoas com acesso' })
    expect(title.parentElement).toHaveClass('px-6')
    expect(screen.getByRole('table').closest('.px-6')).not.toBeNull()
  })
})
