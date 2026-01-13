import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBusinessesPaginated, getBusinessCounts } from '@/app/actions/businesses'
import { getOpportunities } from '@/app/actions/crm'
import { getBookingRequests } from '@/app/actions/booking-requests'
import BusinessesPageClient from './BusinessesPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function BusinessesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/businesses')

  // Parallel server-side data fetching
  // Use paginated fetch for businesses (first 50 only - fast & cacheable) + counts
  const [businessesResult, opportunitiesResult, requestsResult, countsResult] = await Promise.all([
    getBusinessesPaginated({ page: 0, pageSize: 50 }),
    getOpportunities(),
    getBookingRequests(),
    getBusinessCounts(),
  ])

  const initialBusinesses = businessesResult.success ? businessesResult.data || [] : []
  const initialTotal = businessesResult.success && 'total' in businessesResult 
    ? (businessesResult.total as number) || 0 
    : 0
  const initialOpportunities = opportunitiesResult.success ? opportunitiesResult.data || [] : []
  const initialRequests = requestsResult.success ? requestsResult.data || [] : []
  const initialCounts = countsResult.success ? countsResult.data : undefined

  return (
    <AppLayout title="Businesses">
      <BusinessesPageClient 
        initialBusinesses={initialBusinesses}
        initialTotal={initialTotal}
        initialOpportunities={initialOpportunities}
        initialRequests={initialRequests}
        initialCounts={initialCounts}
      />
    </AppLayout>
  )
}
