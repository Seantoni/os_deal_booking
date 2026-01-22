import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import DealMetricsPageClient from './DealMetricsPageClient'
import { getConsolidatedBusinessMetricsPaginated, getBusinessOwnersWithMetrics } from '@/app/actions/deal-metrics'

export default async function DealMetricsPage() {
  await requirePageAccess('/deal-metrics')

  // Fetch initial business metrics and owners list in parallel
  const [consolidatedResult, owners] = await Promise.all([
    getConsolidatedBusinessMetricsPaginated({ page: 0, pageSize: 50 }),
    getBusinessOwnersWithMetrics(),
  ])

  return (
    <AppLayout title="Métricas de Ofertas">
      <DealMetricsPageClient
        initialBusinessMetrics={consolidatedResult.data ?? []}
        initialTotal={consolidatedResult.total ?? 0}
        owners={owners}
      />
    </AppLayout>
  )
}
