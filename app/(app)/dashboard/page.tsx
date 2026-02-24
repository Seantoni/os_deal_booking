import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import DashboardClient from '@/components/dashboard/DashboardClient'
import AppLayout from '@/components/common/AppLayout'
import { getDashboardStats, getPendingBookings } from '@/app/actions/dashboard'
import { getInboxItems } from '@/app/actions/inbox'
import { getPendingComments } from '@/app/actions/comments'
import { getLastNDaysRangeInPanama } from '@/lib/date/timezone'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/dashboard')

  // Default dashboard window: last 7 days (inclusive), based on Panama timezone.
  const defaultRange = getLastNDaysRangeInPanama(7)

  // Fetch initial data on server to avoid blank flash
  const [statsResult, inboxResult, pendingResult, pendingCommentsResult] = await Promise.all([
    getDashboardStats(defaultRange),
    getInboxItems(),
    getPendingBookings(),
    getPendingComments(),
  ])

  const initialData = {
    stats: statsResult.success && 'data' in statsResult && statsResult.data ? statsResult.data : null,
    inboxItems: inboxResult.success && inboxResult.data ? inboxResult.data : [],
    pendingBookings: pendingResult.success && pendingResult.data ? pendingResult.data : [],
    pendingComments: pendingCommentsResult.success && pendingCommentsResult.data ? pendingCommentsResult.data : [],
  }

  return (
    <AppLayout title="Dashboard">
      <DashboardClient initialData={initialData} initialFilters={defaultRange} />
    </AppLayout>
  )
}
