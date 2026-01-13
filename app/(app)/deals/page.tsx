import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getDealsPaginated, getDealsCounts } from '@/app/actions/deals'
import DealsPageClient from './DealsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function DealsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/deals')

  // Prefetch first page of deals + counts in parallel
  const [dealsResult, countsResult] = await Promise.all([
    getDealsPaginated({ page: 0, pageSize: 50 }),
    getDealsCounts(),
  ])
  
  const initialDeals = dealsResult.success && dealsResult.data ? dealsResult.data : []
  const initialTotal = dealsResult.success && 'total' in dealsResult ? dealsResult.total || 0 : 0
  const initialCounts = countsResult.success ? countsResult.data : undefined

  return (
    <AppLayout title="Deals">
      <DealsPageClient 
        initialDeals={initialDeals}
        initialTotal={initialTotal}
        initialCounts={initialCounts}
      />
    </AppLayout>
  )
}
