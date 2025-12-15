import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import DealsPageClient from './DealsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function DealsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/deals')

  return (
    <AppLayout title="Deals">
      <DealsPageClient />
    </AppLayout>
  )
}
