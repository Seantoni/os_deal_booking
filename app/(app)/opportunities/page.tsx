import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import OpportunitiesPageClient from './OpportunitiesPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function OpportunitiesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/opportunities')

  return (
    <AppLayout title="Opportunities">
      <OpportunitiesPageClient />
    </AppLayout>
  )
}
