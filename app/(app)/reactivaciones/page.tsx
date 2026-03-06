import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import VendorReactivationPageClient from './VendorReactivationPageClient'
import {
  getVendorReactivationCounts,
  getVendorReactivationDealsPaginated,
} from '@/app/actions/vendor-reactivation'

export default async function VendorReactivationPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  await requirePageAccess('/reactivaciones')

  const [dealsResult, countsResult] = await Promise.all([
    getVendorReactivationDealsPaginated({ page: 0, pageSize: 50 }),
    getVendorReactivationCounts(),
  ])

  return (
    <AppLayout title="Reactivaciones">
      <VendorReactivationPageClient
        initialDeals={dealsResult.success ? dealsResult.data || [] : []}
        initialTotal={dealsResult.success && 'total' in dealsResult ? dealsResult.total || 0 : 0}
        initialCounts={countsResult.success ? countsResult.data : undefined}
      />
    </AppLayout>
  )
}
