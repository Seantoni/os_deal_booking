import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { requirePageAccess } from '@/lib/auth/page-access'
import { getPipelineData } from '@/app/actions/crm'
import PipelinePageClient from './PipelinePageClient'
import AppLayout from '@/components/common/AppLayout'

export default async function PipelinePage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check role-based access
  await requirePageAccess('/pipeline')

  // Fetch pipeline data
  const pipelineResult = await getPipelineData()
  const pipelineData = pipelineResult.success 
    ? (pipelineResult.data as any) || { opportunities: [], deals: [] }
    : { opportunities: [], deals: [] }

  return (
    <AppLayout title="Pipeline">
      <PipelinePageClient initialData={pipelineData} />
    </AppLayout>
  )
}
