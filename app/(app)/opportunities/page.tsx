import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getOpportunities, getBusinesses } from '@/app/actions/crm'
import OpportunitiesPageClient from './OpportunitiesPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function OpportunitiesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/opportunities')

  // Parallel server-side data fetching
  const [opportunitiesResult, businessesResult] = await Promise.all([
    getOpportunities(),
    getBusinesses(),
  ])

  const initialOpportunities = opportunitiesResult.success ? opportunitiesResult.data || [] : []
  const initialBusinesses = businessesResult.success ? businessesResult.data || [] : []

  return (
    <AppLayout title="Opportunities">
      <OpportunitiesPageClient 
        initialOpportunities={initialOpportunities}
        initialBusinesses={initialBusinesses}
      />
    </AppLayout>
  )
}
