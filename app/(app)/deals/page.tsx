import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getDealsPaginated } from '@/app/actions/deals'
import DealsPageClient from './DealsPageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function DealsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/deals')

  // Prefetch first page of deals
  const dealsResult = await getDealsPaginated({ page: 0, pageSize: 50 })
  const initialDeals = dealsResult.success && dealsResult.data ? dealsResult.data : []
  const initialTotal = dealsResult.success && 'total' in dealsResult ? dealsResult.total || 0 : 0

  return (
    <AppLayout title="Deals">
      <DealsPageClient 
        initialDeals={initialDeals}
        initialTotal={initialTotal}
      />
    </AppLayout>
  )
}
