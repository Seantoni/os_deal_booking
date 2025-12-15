import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import LeadsPageClient from './LeadsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function LeadsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access (admin only)
  await requirePageAccess('/leads')

  return (
    <AppLayout title="Leads">
      <LeadsPageClient />
    </AppLayout>
  )
}
