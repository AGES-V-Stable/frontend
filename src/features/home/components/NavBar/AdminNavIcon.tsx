import home from '@/shared/assets/navigation/home.svg'
import homeActive from '@/shared/assets/navigation/home-active.svg'
import beneficiaries from '@/shared/assets/navigation/beneficiaries.svg'
import beneficiariesActive from '@/shared/assets/navigation/beneficiaries-active.svg'
import transfers from '@/shared/assets/navigation/transfers.svg'
import transfersActive from '@/shared/assets/navigation/transfers-active.svg'
import settings from '@/shared/assets/navigation/settings.svg'
import support from '@/shared/assets/navigation/support.svg'

export type AdminNavIconId = 'home' | 'beneficiaries' | 'transfers' | 'settings' | 'support'

const icons = { home, beneficiaries, transfers, settings, support }
const activeIcons = {
  ...icons,
  home: homeActive,
  beneficiaries: beneficiariesActive,
  transfers: transfersActive,
}

export function AdminNavIcon({ id, active = false }: { id: AdminNavIconId; active?: boolean }) {
  return <img alt="" aria-hidden="true" src={(active ? activeIcons : icons)[id]} />
}
