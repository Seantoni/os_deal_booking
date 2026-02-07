import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import ApiSyncClient from './ApiSyncClient'

export default async function ApiSyncPage() {
  await requirePageAccess('/settings')

  return (
    <AppLayout title="API Sync Test">
      <ApiSyncClient />
    </AppLayout>
  )
}
