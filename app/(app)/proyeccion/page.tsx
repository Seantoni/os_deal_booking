import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import ProjectionPageClient from './ProjectionPageClient'
import { getRevenueProjectionDashboardData } from '@/app/actions/revenue-projections'

const EMPTY_SUMMARY = {
  totalInProcessRequests: 0,
  totalBookedRequests: 0,
  totalProjectedInProcessRevenue: 0,
  totalProjectedBookedRevenue: 0,
  totalProjectedRevenue: 0,
  projectedInProcessCount: 0,
  projectedBookedCount: 0,
  inProcessCoveragePct: 0,
  bookedCoveragePct: 0,
  latestMetricsSyncAt: null as string | null,
}

export default async function ProjectionPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  await requirePageAccess('/proyeccion')

  const result = await getRevenueProjectionDashboardData()
  const initialRows = result.success && result.data ? JSON.parse(JSON.stringify(result.data)) : []
  const initialSummary = result.success && result.summary
    ? JSON.parse(JSON.stringify(result.summary))
    : EMPTY_SUMMARY

  return (
    <AppLayout title="Proyección">
      <ProjectionPageClient
        initialRows={initialRows}
        initialSummary={initialSummary}
      />
    </AppLayout>
  )
}
