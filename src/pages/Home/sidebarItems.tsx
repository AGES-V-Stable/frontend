const icons = {
  home: <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />,
  beneficiaries: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" />
    </>
  ),
  transfers: <path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5" />,
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

export const sidebarItems = [
  { id: 'home', label: 'Início' },
  { id: 'beneficiaries', label: 'Beneficiários' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'settings', label: 'Configurações' },
].map((item) => ({
  ...item,
  icon: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-full"
      focusable="false"
    >
      {icons[item.id as keyof typeof icons]}
    </svg>
  ),
}))
