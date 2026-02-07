import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getPipelineDataPaginated } from '@/app/actions/pipeline'
import PipelinePageClient from './PipelinePageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function PipelinePage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/pipeline')

  // Fetch first page of pipeline data
  const pipelineResult = await getPipelineDataPaginated({ page: 0, pageSize: 50 })
  const pipelineData = pipelineResult.success && pipelineResult.data
    ? pipelineResult.data
    : { opportunities: [], deals: [], preBookedEvents: [] }
  const initialTotal = pipelineResult.success && 'total' in pipelineResult 
    ? pipelineResult.total || 0 
    : 0

  return (
    <AppLayout title="Pipeline">
      <PipelinePageClient 
        initialData={pipelineData} 
        initialTotal={initialTotal}
      />
    </AppLayout>
  )
}
