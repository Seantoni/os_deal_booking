import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import DealMetricsPageClient from './DealMetricsPageClient'
import { getDealMetricsPaginated, getDealMetricsCounts, getUniqueVendorIds } from '@/app/actions/deal-metrics'

export default async function DealMetricsPage() {
  await requirePageAccess('/deal-metrics')

  // Fetch initial data server-side
  const [{ data: initialMetrics, total: initialTotal }, initialCounts, vendors] = await Promise.all([
    getDealMetricsPaginated({ page: 0, pageSize: 50 }),
    getDealMetricsCounts(),
    getUniqueVendorIds(),
  ])

  return (
    <AppLayout title="Métricas de Ofertas">
      <DealMetricsPageClient
        initialMetrics={initialMetrics}
        initialTotal={initialTotal}
        initialCounts={initialCounts}
        vendors={vendors}
      />
    </AppLayout>
  )
}
