import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import BusinessesPageClient from './BusinessesPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function BusinessesPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/businesses')

  return (
    <AppLayout title="Businesses">
      <BusinessesPageClient />
    </AppLayout>
  )
}
