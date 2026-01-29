import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import LeadsNegociosClient from './LeadsNegociosClient'
import AppLayout from '@/components/common/AppLayout'

export default async function LeadsNegociosPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access (admin only)
  await requirePageAccess('/leads-negocios')

  return (
    <AppLayout title="Leads Negocios">
      <LeadsNegociosClient />
    </AppLayout>
  )
}
