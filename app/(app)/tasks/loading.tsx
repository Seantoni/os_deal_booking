import { TablePageLoadingSkeleton } from '@/components/common/PageLoadingSkeleton'

export default function TasksLoading() {
  return <TablePageLoadingSkeleton columns={5} showFilterTabs={true} filterTabCount={3} />
}

