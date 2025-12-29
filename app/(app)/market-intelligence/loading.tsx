import { TablePageLoadingSkeleton } from '@/components/common/PageLoadingSkeleton'

export default function MarketIntelligenceLoading() {
  return <TablePageLoadingSkeleton columns={8} showFilterTabs={true} filterTabCount={4} />
}

