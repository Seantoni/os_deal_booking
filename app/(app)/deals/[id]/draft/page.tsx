import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getDealWithDraft } from '@/app/actions/dealDraft'
import DealDraftPageClient from './DealDraftPageClient'

interface DealDraftPageProps {
  params: Promise<{ id: string }>
}

export default async function DealDraftPage({ params }: DealDraftPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { id } = await params
  const result = await getDealWithDraft(id)

  if (!result.success || !result.data) {
    redirect('/deals')
  }

  return <DealDraftPageClient deal={result.data} />
}

