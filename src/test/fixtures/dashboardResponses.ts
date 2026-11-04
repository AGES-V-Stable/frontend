/**
 * Respostas reais do backend (feat/44-dashboard-api, perfil dev com dados sintéticos), capturadas
 * na verificação de integração do dashboard. Servem de contrato para os schemas do frontend.
 */
export const realSummary = {
  currency: 'BRL',
  startDate: '2026-06-01',
  endDate: '2026-11-03',
  amount: '2127.90',
  referenceSpreadPercentage: '4.00',
  averageEffectiveSpreadPercentage: '0.01',
  incomplete: true,
  incompleteOperations: 1,
}

export const realRemittanceVolume = {
  currency: 'BRL',
  granularity: 'MONTH',
  startDate: '2026-06-01',
  endDate: '2026-11-03',
  total: '72022.50',
  points: [
    { month: '2026-06', amount: '20000.00' },
    { month: '2026-07', amount: '0.00' },
    { month: '2026-08', amount: '35000.00' },
    { month: '2026-09', amount: '12000.00' },
    { month: '2026-10', amount: '5022.50' },
    { month: '2026-11', amount: '0.00' },
  ],
  incompleteOperations: 0,
}

export const realEmptySeries = {
  currency: 'BRL',
  granularity: 'MONTH',
  startDate: '2026-01-01',
  endDate: '2026-02-28',
  total: '0.00',
  points: [],
  incompleteOperations: 0,
}

/** Página do Spring Data com os campos extras que o backend serializa. */
export const realSettlementsPage = {
  content: [
    {
      id: 'ec43e625-0d5a-47d4-897c-5f63d285a0ca',
      companyId: 'ebfd1edf-f49a-46a7-ada6-d9c7598a31ef',
      companyName: 'V-Stable Demo',
      settledAt: null,
      createdAt: '2026-11-04T00:48:19.1542Z',
      direction: 'RECEIPT',
      counterparty: 'Demo Overseas Customer',
      destination: null,
      amount: '2000.00',
      currency: 'USD',
      amountBrl: '9955.00',
      exchangeRate: '5.000000',
      feeBrl: '45.00',
      savings: null,
      status: 'AWAITING_PAYMENT',
    },
    {
      id: '00000000-0000-0000-0000-000000000a02',
      companyId: 'ebfd1edf-f49a-46a7-ada6-d9c7598a31ef',
      companyName: 'V-Stable Demo',
      settledAt: null,
      createdAt: '2026-08-10T12:00:00Z',
      direction: 'PAYMENT',
      counterparty: 'Shenzhen AeroCrop',
      destination: 'CN • Agricultural Bank of China',
      amount: '6457.56',
      currency: 'USD',
      amountBrl: '35000.00',
      exchangeRate: '5.420000',
      feeBrl: '150.00',
      savings: '1244.00',
      status: 'SETTLED',
    },
  ],
  empty: false,
  first: true,
  last: false,
  number: 0,
  numberOfElements: 2,
  pageable: {
    offset: 0,
    pageNumber: 0,
    pageSize: 2,
    paged: true,
    sort: { empty: true, sorted: false, unsorted: true },
    unpaged: false,
  },
  size: 2,
  sort: { empty: true, sorted: false, unsorted: true },
  totalElements: 6,
  totalPages: 3,
}

export const realTransactionVolume = { transactedVolumeBrl: '152022.50' }
