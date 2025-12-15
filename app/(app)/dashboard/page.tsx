import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import DashboardClient from '@/components/dashboard/DashboardClient'
import AppLayout from '@/components/common/AppLayout'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/dashboard')

  return (
    <AppLayout title="Dashboard">
      <DashboardClient />
    </AppLayout>
  )
}
