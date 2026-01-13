import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getLeadsPaginated } from '@/app/actions/leads'
import LeadsPageClient from './LeadsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function LeadsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access (admin only)
  await requirePageAccess('/leads')

  // Prefetch first page of leads
  const leadsResult = await getLeadsPaginated({ page: 0, pageSize: 50 })
  const initialLeads = leadsResult.success && leadsResult.data ? leadsResult.data : []
  const initialTotal = leadsResult.success && 'total' in leadsResult ? leadsResult.total || 0 : 0

  return (
    <AppLayout title="Leads">
      <LeadsPageClient 
        initialLeads={initialLeads}
        initialTotal={initialTotal}
      />
    </AppLayout>
  )
}
