export type AdminNavIconId = 'home' | 'beneficiaries' | 'transfers' | 'settings'

interface AdminNavIconProps {
  id: AdminNavIconId
}

export function AdminNavIcon({ id }: AdminNavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-full"
      focusable="false"
    >
      {id === 'home' && <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />}
      {id === 'beneficiaries' && (
        <>
          <circle cx="9" cy="7" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" />
        </>
      )}
      {id === 'transfers' && <path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5" />}
      {id === 'settings' && (
        <>
          <path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )
}
