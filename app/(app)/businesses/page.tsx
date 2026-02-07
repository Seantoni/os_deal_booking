import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBusinessesPaginated, getBusinessCounts } from '@/app/actions/businesses'
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
  // Note: Opportunity/request counts are now loaded lazily on client-side for faster initial load
  const [businessesResult, countsResult] = await Promise.all([
    getBusinessesPaginated({ page: 0, pageSize: 50 }),
    getBusinessCounts(),
  ])

  const initialBusinesses = businessesResult.success ? businessesResult.data || [] : []
  const initialTotal = businessesResult.success && 'total' in businessesResult 
    ? (businessesResult.total as number) || 0 
    : 0
  const initialCounts = countsResult.success ? countsResult.data : undefined

  return (
    <AppLayout title="Businesses">
      <BusinessesPageClient 
        initialBusinesses={initialBusinesses}
        initialTotal={initialTotal}
        initialCounts={initialCounts}
      />
    </AppLayout>
  )
}
