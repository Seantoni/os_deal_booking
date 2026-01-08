import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import DashboardClient from '@/components/dashboard/DashboardClient'
import AppLayout from '@/components/common/AppLayout'
import { getDashboardStats, getPendingBookings } from '@/app/actions/dashboard'
import { getInboxItems } from '@/app/actions/inbox'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/dashboard')

  // Fetch initial data on server to avoid blank flash
  const [statsResult, inboxResult, pendingResult] = await Promise.all([
    getDashboardStats({}),
    getInboxItems(),
    getPendingBookings(),
  ])

  const initialData = {
    stats: statsResult.success && 'data' in statsResult ? statsResult.data : null,
    inboxItems: inboxResult.success && inboxResult.data ? inboxResult.data : [],
    pendingBookings: pendingResult.success && pendingResult.data ? pendingResult.data : [],
  }

  return (
    <AppLayout title="Dashboard">
      <DashboardClient initialData={initialData} />
    </AppLayout>
  )
}
