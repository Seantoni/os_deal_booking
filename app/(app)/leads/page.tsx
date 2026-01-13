import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getLeadsPaginated, getLeadsCounts } from '@/app/actions/leads'
import LeadsPageClient from './LeadsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function LeadsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access (admin only)
  await requirePageAccess('/leads')

  // Prefetch first page of leads + counts in parallel
  const [leadsResult, countsResult] = await Promise.all([
    getLeadsPaginated({ page: 0, pageSize: 50 }),
    getLeadsCounts(),
  ])
  
  const initialLeads = leadsResult.success && leadsResult.data ? leadsResult.data : []
  const initialTotal = leadsResult.success && 'total' in leadsResult ? leadsResult.total || 0 : 0
  const initialCounts = countsResult.success ? countsResult.data : undefined

  return (
    <AppLayout title="Leads">
      <LeadsPageClient 
        initialLeads={initialLeads}
        initialTotal={initialTotal}
        initialCounts={initialCounts}
      />
    </AppLayout>
  )
}
