import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getBusinesses, getOpportunities } from '@/app/actions/crm'
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
  const [businessesResult, opportunitiesResult, requestsResult] = await Promise.all([
    getBusinesses(),
    getOpportunities(),
    getBookingRequests(),
  ])

  const initialBusinesses = businessesResult.success ? businessesResult.data || [] : []
  const initialOpportunities = opportunitiesResult.success ? opportunitiesResult.data || [] : []
  const initialRequests = requestsResult.success ? requestsResult.data || [] : []

  return (
    <AppLayout title="Businesses">
      <BusinessesPageClient 
        initialBusinesses={initialBusinesses}
        initialOpportunities={initialOpportunities}
        initialRequests={initialRequests}
      />
    </AppLayout>
  )
}
