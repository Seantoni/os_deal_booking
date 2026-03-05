import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import DealImportTestClient from './DealImportTestClient'

export default async function DealImportTestPage() {
  await requirePageAccess('/settings/deal-import')

  return (
    <AppLayout title="Deal Import Test">
      <DealImportTestClient />
    </AppLayout>
  )
}
