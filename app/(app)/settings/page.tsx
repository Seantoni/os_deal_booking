import { requirePageAccess } from '@/lib/auth/page-access'
import SettingsPageClient from './SettingsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function SettingsPage() {
  // Check role-based access (admin only)
  await requirePageAccess('/settings')

  return (
    <AppLayout title="Settings">
      <SettingsPageClient />
    </AppLayout>
  )
}
