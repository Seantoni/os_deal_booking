import { requirePageAccess } from '@/lib/auth/page-access'
import ActivityLogClient from './ActivityLogClient'
import AppLayout from '@/components/common/AppLayout'

export const dynamic = 'force-dynamic'

export default async function ActivityLogPage() {
  await requirePageAccess('/activity-log')
  
  return (
    <AppLayout title="Activity Log">
      <ActivityLogClient />
    </AppLayout>
  )
}
