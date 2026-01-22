import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import DealMetricsPageClient from './DealMetricsPageClient'
import { getDealMetricsPaginated, getDealMetricsCounts, getUniqueVendorIds } from '@/app/actions/deal-metrics'

export default async function DealMetricsPage() {
  await requirePageAccess('/deal-metrics')

  // Fetch initial data server-side
  const [paginatedResult, countsResult, vendors] = await Promise.all([
    getDealMetricsPaginated({ page: 0, pageSize: 50 }),
    getDealMetricsCounts(),
    getUniqueVendorIds(),
  ])

  return (
    <AppLayout title="Métricas de Ofertas">
      <DealMetricsPageClient
        initialMetrics={paginatedResult.data ?? []}
        initialTotal={paginatedResult.total ?? 0}
        initialCounts={countsResult.data ?? { all: 0, active: 0, ended: 0 }}
        vendors={vendors}
      />
    </AppLayout>
  )
}
