import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getOpportunitiesPaginated, getOpportunityCounts } from '@/app/actions/opportunities'
import { getBusinessesPaginated } from '@/app/actions/businesses'
import OpportunitiesPageClient from './OpportunitiesPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function OpportunitiesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/opportunities')

  // Parallel server-side data fetching with pagination (first 50 only) + counts
  const [opportunitiesResult, businessesResult, countsResult] = await Promise.all([
    getOpportunitiesPaginated({ page: 0, pageSize: 50 }),
    getBusinessesPaginated({ page: 0, pageSize: 50 }),
    getOpportunityCounts(),
  ])

  const initialOpportunities = opportunitiesResult.success ? opportunitiesResult.data || [] : []
  const initialTotal = opportunitiesResult.success && 'total' in opportunitiesResult
    ? (opportunitiesResult.total as number) || 0
    : 0
  const initialBusinesses = businessesResult.success ? businessesResult.data || [] : []
  const initialCounts = countsResult.success ? countsResult.data : undefined

  return (
    <AppLayout title="Opportunities">
      <OpportunitiesPageClient 
        initialOpportunities={initialOpportunities}
        initialTotal={initialTotal}
        initialBusinesses={initialBusinesses}
        initialCounts={initialCounts}
      />
    </AppLayout>
  )
}
